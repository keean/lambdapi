import {nameGet, NameEnv} from '../common.ts'
import {Value, ITerm, CTerm, Env, VLam, vfree, vapp, VSort, VPi} from './ast.ts';

export function iEval(term: ITerm, d: {nameEnv: NameEnv<Value>, env: Env}): Value {
    switch (term.tag) {
        case 'ann': return cEval(term.cTerm, d);
        case 'free': return nameGet(d.nameEnv, term.free) ?? vfree(term.free);
        case 'bound': return d.env[term.bound];
        case 'app': return vapp(iEval(term.iTerm, d), cEval(term.cTerm, d));
        case 'sort': return VSort(term.sort);
        case 'pi': return VPi(cEval(term.dom, d), (x => cEval(term.cod, {nameEnv: d.nameEnv, env:[x, ...d.env]})));
    }
}

export function cEval(term: CTerm, d: {nameEnv: NameEnv<Value>, env: Env}): Value {
    switch (term.tag) {
        case 'inf': return iEval(term.inf, d);
        case 'lam': return VLam(x => cEval(term.lam, {nameEnv: d.nameEnv, env: [x, ...d.env]}));
    }
}