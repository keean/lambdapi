import {Local, Name, NameEnv} from '../common.ts'
import {ITerm, CTerm, Context, Ann, App, Inf, Lam, Free, Star, contextGet, Pi, VStar, Type, Value, vfree, cTermEq} from './ast.ts';
import {cEval} from './eval.ts';
import { iPrint, print } from "./print.ts";
import { quote0 } from "./quote.ts";

export type TypeError = {tag: 'typeError', error: string};
export function TypeError(error: string): TypeError {
    return {tag: 'typeError', error};
}

function unknownIdentifier(x: Name): never {
    switch (x.tag) {
        case 'global':
            throw TypeError(`unknown identifier '${x.global}'`);
        default:
            throw 'this should never happen';
    }
}

//----------------------------------------------------------------------------
// Type Check

export function iType0(t: ITerm, g: {nameEnv: NameEnv<Value>, env: Context}): Type {
    return iType(t, g, 0);
}

export function iType(t: ITerm, g: {nameEnv: NameEnv<Value>, env: Context}, i: number): Type {
    switch (t.tag) {
        case 'ann': {
            cType(t.tTerm, g, i, VStar());
            const u = cEval(t.tTerm, {nameEnv: g.nameEnv, env: []});
            cType(t.cTerm, g, i, u);
            return u;
        }
        case 'star':
            return VStar();
        case 'pi': {
            cType(t.dom, g, i, VStar());
            const u = cEval(t.dom, {nameEnv: g.nameEnv, env: []});
            cType(
                cSubst(t.cod, Free(Local(i)), 0),
                {nameEnv: g.nameEnv, env: [{name: Local(i), info: u}, ...g.env]},
                i + 1,
                VStar()
            );
            return VStar(); 
        }
        case 'bound':
            throw TypeError('this should never happen');
        case 'free': {
            const x = contextGet(g.env, t.free);
            if (x === undefined) {
                unknownIdentifier(t.free);
            }
            return x;
        }
        case 'app': {
            const s = iType(t.iTerm, g, i);
            switch (s.tag) {
                case 'vpi':
                    cType(t.cTerm, g, i, s.dom);
                    return s.cod(cEval(t.cTerm, {nameEnv: g.nameEnv, env: []}));
                default:
                    throw TypeError('illegal application');
            } 
        }
    }
}

function cType(t: CTerm, g: {nameEnv: NameEnv<Value>, env: Context}, i: number, ty: Type) {
    if (t.tag === 'inf') {
        const u = iType(t.inf, g, i);
        if (!cTermEq(quote0(ty), quote0(u))) {
            throw TypeError(`type mismatch:\n`
                + `type inferred: ${print(quote0(u))}\n`
                + `type expected: ${print(quote0(ty))}\n`
                + `for expression: ${iPrint(0, 0, t.inf)}`
            );
        }
    } else if (t.tag === 'lam' && ty.tag === 'vpi') {
        cType(
            cSubst(t.lam, Free(Local(i)), 0),
            {nameEnv: g.nameEnv, env: [{name: Local(i), info: ty.dom}, ...g.env]},
            i + 1,
            ty.cod(vfree(Local(i))),
        );
    } else {
        throw TypeError(`${print(t)} type mismatch ${print(quote0(ty))}`);
    }
}

//----------------------------------------------------------------------------
// Substitute

function iSubst(l: ITerm, r: ITerm, i: number): ITerm {
    switch(l.tag) {
        case 'ann': return Ann(cSubst(l.cTerm, r, i), cSubst(l.tTerm, r, i));
        case 'star': return Star();
        case 'pi': return Pi(cSubst(l.dom, r, i), cSubst(l.cod, r, i + 1));
        case 'bound': return (i === l.bound) ? r : l;
        case 'free': return l;
        case 'app': return App(iSubst(l.iTerm, r, i), cSubst(l.cTerm, r, i));
    }
}

function cSubst(l: CTerm, r: ITerm, i: number): CTerm {
    switch(l.tag) {
        case 'inf': return Inf(iSubst(l.inf, r, i));
        case 'lam': return Lam(cSubst(l.lam, r, i + 1));
    }
}