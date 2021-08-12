import {parseITerm0, parseStatement} from './parser.ts';
import {Global, Type} from '../common.ts';
import {CTerm, HasType, Info, ITerm, Value} from './ast.ts';
import {readEvalPrint, Interpreter, State} from '../repl.ts';
import {print, printType} from './print.ts';
import {quote0} from './quote.ts';
import {iEval} from './eval.ts';
import {iType} from './check.ts';


const st: Interpreter<ITerm,CTerm,Value,Type,Info,Info> = {
    iname: 'the simply typed lambda calculus',
    iprompt: 'ST> ',
    iitype: (_v, c, t) => iType(t, c, 0),
    iquote: quote0,
    ieval: (nameEnv, x) => iEval(x, {nameEnv, env: []}),
    ihastype: HasType,
    icprint: x => print(x),
    itprint: x => printType(x),
    iiparse: parseITerm0,
    isparse: parseStatement,
    iassume: stassume,
};

function stassume([out, ve, te]: State<Value,Info>, {name, info}: {name: string, info:Info}): State<Value,Info> {
    return [out, ve, [{name: Global(name), info}, ...te]];
}

await readEvalPrint(st);
