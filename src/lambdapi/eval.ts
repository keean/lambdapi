import {nameGet, NameEnv} from '../common.ts'
import {Value, ITerm, CTerm, Env, VLam, vfree, vapp, VStar, VPi} from './ast.ts';

export function iEval(term: ITerm, d: {nameEnv: NameEnv<Value>, env: Env}): Value {
    switch (term.tag) {
        case 'ann': return cEval(term.cTerm, d);
        case 'free': {
            const x = nameGet(d.nameEnv, term.free);
            return (x !== undefined) ? x : vfree(term.free)
        }
        case 'bound': return d.env[term.bound];
        case 'app': return vapp(iEval(term.iTerm, d), cEval(term.cTerm, d));
        case 'star': return VStar();
        case 'pi': return VPi(cEval(term.dom, d), (x => cEval(term.cod, {nameEnv: d.nameEnv, env:[x, ...d.env]})));
    }
}

export function cEval(term: CTerm, d: {nameEnv: NameEnv<Value>, env: Env}): Value {
    switch (term.tag) {
        case 'inf': return iEval(term.inf, d);
        case 'lam': return VLam(x => cEval(term.lam, {nameEnv: d.nameEnv, env: [x, ...d.env]}));
    }
}
