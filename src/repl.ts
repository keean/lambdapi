import { readLines, parse, Parser, many, Result } from './deps.ts';
import { Global, Name, Statement, NameEnv } from "./common.ts";


//============================================================================
// REPL

type Ctx<Inf> = {name: Name, info: Inf}[]
    
function Ctx<Inf>(): Ctx<Inf> {
    return [];
}

export type State<V,Inf> = [string, NameEnv<V>, Ctx<Inf>];
function State<V,Inf>(): State<V,Inf> {
    return ['', NameEnv<V>(), Ctx<Inf>()];
}

export type Interpreter<I,C,V,T,TInf,Inf> = {
    iname: string,
    iprompt: string,
    iitype: (_1: NameEnv<V>, _2: Ctx<Inf>, _3: I) => T,
    iquote: (_:V) => C,
    ieval: (_1: NameEnv<V>, _2: I) => V,
    ihastype: (_:T) => Inf;
    icprint: (_:C) => string,
    itprint: (_:T) => string,
    iiprint: (_:Inf) => string,
    iiparse: Parser<string[], I>,
    isparse: Parser<string[], Statement<I, TInf>>,
    iassume: (_1:State<V,Inf>, _:{name: string, info: TInf}) => State<V,Inf>,
};

type Interactive = {tag: 'interactive', interactive: string};
function Interactive(interactive: string): CompileForm {
    return {tag: 'interactive', interactive};
} 

type File = {tag: 'file', file: string};
function File(file: string): CompileForm {
    return{tag: 'file', file};
}

type CompileForm =
    | Interactive 
    | File
    ;

type TypeOf = {tag: 'typeOf', typeOf: string};
function TypeOf(typeOf: string): Command {
    return {tag: 'typeOf', typeOf};
}

type Compile = {tag: 'compile', compile: CompileForm};
function Compile(compile: CompileForm): Command {
    return {tag: 'compile', compile};
}

type Browse = {tag: 'browse'};
function Browse(): Command {
    return {tag: 'browse'};
}

type Quit = {tag: 'quit'};
function Quit(): Command {
    return {tag: 'quit'};
}

type Help = {tag: 'help'};
function Help(): Command {
    return {tag: 'help'};
}

type Noop = {tag: 'noop'};
function Noop(): Command {
    return {tag: 'noop'};
}

type Command =
    | TypeOf
    | Compile
    | Browse
    | Quit
    | Help
    | Noop
    ;

type InteractiveCommand = {
    cmd: string[],
    args?: string,
    op(_: string): Command,
    help: string,
}

const commands: InteractiveCommand[] = [
    {cmd: [':type'], op: TypeOf, args: '<expr>', help: 'print type of expression'},
    {cmd: [':browse'], op: Browse, help: 'browse names in scope'},
    {cmd: [':load'], op: x => Compile(File(x)), args: '<file>', help: 'load program from file'},
    {cmd: [':quit'], op: Quit, help: 'exit interpreter'},
    {cmd: [':help', ':?'], op: Help, help: 'display this list of commands'},
];

function help(cmds: InteractiveCommand[]) {
    return `List of commands: Any command may be abbreviated to :c where `
        + `c is the first character in the full name.\n\n`
        + `<expr>                   evaluate expression\n`
        + `let <var> = <expr>       define variable\n`
        + `assume <var> :: <expr>   assume variable\n\n`
        + cmds.map(({cmd, args, help}) => {
            const ct = `${cmd.join(', ')} ${args ?? ''}`;
            return `${ct}${' '.repeat(24 - ct.length)} ${help}`;
        }).join('\n') + `\n`;
}

function match(icmds: InteractiveCommand[], input: string): InteractiveCommand[] {
    const matches: InteractiveCommand[] = [];
    for (const icmd of icmds) {
        for (const cmd of icmd.cmd) {
            if (cmd.startsWith(input)) {
                matches.push(icmd);
            }
        }
    }
    return matches;
}


export async function readEvalPrint<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>) {
    console.log(`Interpreter for ${int.iname}.\nType :? for help.`);
    const prompt = new TextEncoder().encode(int.iprompt);
    let state = State<V,Inf>();
    Deno.stdout.writeSync(prompt);
    for await (const rawLine of readLines(Deno.stdin)) {
        const line = rawLine.trim();
        if (line) {
            const cmd = interpretCommand(line);
            const newState = await handleCommand(int, state, cmd);
            if (newState !== undefined) {
                state = newState;
            } else {
                return;
            }
        }
        Deno.stdout.writeSync(prompt);
    }
}

function interpretCommand(line: string): Command {
    if (line.startsWith(':')) {
        const [_, cmd, rest] = /^(\S+)\s*(.*)$/.exec(line) ?? [];
        const matches = match(commands, cmd);
        if (matches.length < 1) {
            console.log(`Unknown command ${cmd}. Type :? for help.`);
            return Noop();
        } else if (matches.length > 1) {
            console.log(`Ambiguous command, could be ${matches.map(x => x.cmd[0]).join(', ')}.`);
            return Noop();     
        } else {
            return matches[0].op(rest);
        }
    } else {
        return Compile(Interactive(line));
    }
}

async function handleCommand<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>, [out, ve, te]: State<V,Inf>, cmd: Command): Promise<State<V,Inf>|undefined> {
    //console.log('TAG', cmd.tag);
    switch (cmd.tag) {
        case 'quit':
            return;
        case 'noop':
            return [out, ve, te];
        case 'help':
            console.log(help(commands));
            return [out, ve, te];
        case 'typeOf': {
            const x = parse(int.iiparse)({cs: cmd.typeOf, pos: 0, attr: []});
            if (x.result !== undefined) {
                const t = iinfer(int, ve, te, x.result);
                if (t !== undefined) {
                    console.log(int.itprint(t));
                }
            } else {
                showError(x);
            }
            return [out, ve, te];
        }
        case 'browse':
            console.log(te.reduce((acc,x) => x.name.tag === 'global' ? [`${x.name.global} :: ${int.iiprint(x.info)}`, ...acc] : acc, new Array<string>()).join('\n'));
            return [out, ve, te];
        case 'compile':
            switch(cmd.compile.tag) {
                case 'interactive':
                    return compilePhrase(int, [out, ve, te], cmd.compile.interactive);
                case 'file':
                    return await compileFile(int, [out, ve, te], cmd.compile.file);
            }
    }
}

async function compileFile<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>, state: State<V,Inf>, n: string): Promise<State<V,Inf>|undefined> {
    const text = await Deno.readTextFile(n);
    const stmts = parse(many(int.isparse))({cs:text, pos:0, attr:[]});
    if (stmts.result !== undefined) {
        return stmts.result.reduce((state: State<V,Inf>, x) => handleStmt(int, state, x), state);
    } else {
        return state;
    }
}

function compilePhrase<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>, [out, ve, te]: State<V,Inf>, n: string): State<V,Inf>|undefined {
    const x = parse(int.isparse)({cs:n, pos:0, attr:[]});
    //console.log('=====================================');
    //console.dir(x, {depth: Number.MAX_SAFE_INTEGER});
    //console.log('=====================================');
    if (x.result !== undefined) {
        return handleStmt(int, [out, ve, te], x.result);
    } else {
        showError(x);
        return [out, ve, te];
    }
}

function iinfer<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>, d: NameEnv<V>, g: Ctx<Inf>, t: I): T|undefined {
    try {
        return int.iitype(d,g,t);
    } catch (e) {
        if (e.tag === 'typeError') {
            console.log(`TypeError: ${e.error}`);
            return;
        }
    }
}

function handleStmt<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>, [out,ve,te]: State<V,Inf>, stmt: Statement<I,TInf>): State<V,Inf> {
    switch (stmt.tag) {
        case 'assume':
            //console.debug('ASSUME', stmt.assume);
            return stmt.assume.reduce((state, ass) => int.iassume(state, ass), [out,ve,te]);
        case 'let':
            //console.debug('LET', stmt.name, stmt.term, ve, te);
            return checkEval(stmt.name, stmt.term);
        case 'eval':
            return checkEval(null, stmt.term);
        case 'putstrln':
            console.log(stmt.putstrln);
            return [out, ve, te];
        case 'out':
            return [stmt.out, ve, te];
    }

    function checkEval(i: string|null, t: I): State<V,Inf> {
        return check(int, [out, ve, te], t, (y:T, v:V) => {
            if (i === null) {
                console.log(`${int.icprint(int.iquote(v))} :: ${int.itprint(y)}`);
            } else {
                console.log(`${i} :: ${int.itprint(y)}`);
            }
        }, (y:T, v:V) => {
            if (i !== null) {
                return [
                    '',
                    [{name: Global(i), value: v}, ...ve], 
                    [{name: Global(i), info: int.ihastype(y)}, ...te],
                ];
            } else {
                return [out, ve, te];
            }
        });
    }
}

export function check<I,C,V,T,TInf,Inf>(int: Interpreter<I,C,V,T,TInf, Inf>, [out,ve,te]: State<V,Inf>, t: I, kp: (_1:T, _2:V) => void, k: (_1:T, _2:V) => State<V,Inf>): State<V,Inf> {
    const x = iinfer(int, ve, te, t);
    if (x === undefined) {
        return [out,ve,te];
    }
    const v = int.ieval(ve, t);
    kp(x, v);
    return k(x, v);
} 

function showError<A>({cs, errors}: Result<A>) {
    const es = errors.sort((x, y) => x.pos - y.pos);
    console.log(cs);
    for (const e of es) {
        console.log(`${' '.repeat(e.pos)}^ ${e.error}`);
    }
}