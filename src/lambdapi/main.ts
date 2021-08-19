import {parseITerm0, parseStatement} from './parser.ts';
import {Global} from '../common.ts';
import {Ann, CTerm, Inf, ITerm, Sort, Type, Value} from './ast.ts';
import {readEvalPrint, Interpreter, State, check} from '../repl.ts';
import {print} from './print.ts';
import {quote0} from './quote.ts';
import {iEval} from './eval.ts';
import {iType0} from './check.ts';


const lp: Interpreter<ITerm,CTerm,Value,Value,CTerm,Value> = {
    iname: 'lambda-Pi',
    iprompt: 'LP> ',
    iitype: (v, c, t) => iType0(t, {nameEnv: v, env: c}),
    iquote: quote0,
    ieval: (nameEnv, x) => iEval(x, {nameEnv, env: []}),
    ihastype: x => x,
    icprint: x => print(x),
    itprint: x => print(quote0(x)),
    iiprint: x => print(quote0(x)),
    iiparse: parseITerm0,
    isparse: parseStatement,
    iassume: lpassume,
};

function lpassume([out, ve, te]: State<Value,Type>, {name, info}: {name: string, info: CTerm}): State<Value,Type> {
    return check(
        lp,
        [out, ve, te],
        Ann(info, Inf(Sort(''))), // empty sort matches any sort.
        (_1, _2) => {},
        (_, info) => [out, ve, [{name: Global(name), info}, ...te]]
    );
}

await readEvalPrint(lp);