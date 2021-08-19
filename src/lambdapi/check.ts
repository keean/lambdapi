import {Local, Name, NameEnv, nameEq} from '../common.ts'
import {ITerm, CTerm, Context, Ann, App, Inf, Lam, Free, contextGet, Pi, VSort, Type, Value, vfree} from './ast.ts';
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
// Pure Type System

type PureTypeSystem = {
    sorts: Set<string>,
    axioms: Map<string, string>,
    rules: Map<string, Map<string, string|null>>,
};

// CoC
const pts: PureTypeSystem = {
    sorts: new Set(['*', '?']),
    axioms: new Map([
        ['*','?'],
    ]),
    rules: new Map([
        ['*', new Map([
            ['*', null],
            ['?', null],
        ])],
        ['?', new Map([
            ['*', null],
            ['?', null],
        ])],
    ]),
}

/*
// Simply Typed
const pts: PureTypeSystem = {
    sorts: new Set(['*', '?']),
    axioms: new Map([
        ['*','?'],
    ]),
    rules: new Map([
        ['*', new Map([
            ['*', null],
        ])],
    ]),
};
*/

//----------------------------------------------------------------------------
// Type Check

export function iType0(t: ITerm, g: {nameEnv: NameEnv<Value>, env: Context}): Type {
    return iType(t, g, 0);
}

function iType(t: ITerm, g: {nameEnv: NameEnv<Value>, env: Context}, i: number): Type {
    switch (t.tag) {
        case 'sort': {
            if (t.sort !== '') {
                const s = pts.axioms.get(t.sort);
                if (s !== undefined) {
                    return VSort(s);
                } else {
                    throw TypeError(`wrong sort`);
                }
            }
            return VSort(t.sort);
        }
        case 'free': {
            const x = contextGet(g.env, t.free);
            if (x === undefined) {
                unknownIdentifier(t.free);
            }
            return x;
        }
        case 'ann': {
            const s = iSort(t.tTerm, g, i);
            if (s !== null && s.tag === 'vsort' && (s.vsort === '' || pts.sorts.has(s.vsort))) {
                const u = cEval(t.tTerm, {nameEnv: g.nameEnv, env: []});
                cType(t.cTerm, g, i, u);
                return u;
            } else {
                throw TypeError(`${print(t.tTerm)} type mismatch ${Array.from(pts.sorts)}`);
            }
        }
        case 'pi': {
            const s1 = iSort(t.dom, g, i);
            const u = cEval(t.dom, {nameEnv: g.nameEnv, env: []});
            const cod = cSubst(t.cod, Free(Local(i)), 0);
            const s2 = iSort(cod, {nameEnv: g.nameEnv, env: [{name: Local(i), info: u}, ...g.env]}, i + 1);
            if (s1 !== null && s2 !== null && s1.tag === 'vsort' && s2.tag === 'vsort') {
                const s3 = pts.rules.get(s1.vsort)?.get(s2.vsort);
                if (s3 !== undefined) {
                    return (s3 === null) ? s2 : VSort(s3);
                }
            }
            throw TypeError(`${print(Inf(t))} no rule [${(s1 !== null) ? print(quote0(s1)) : null}, ${(s2 !== null) ? print(quote0(s2)) : 'null'}]`);
        }
        case 'bound':
            throw TypeError('this should never happen');
        case 'app': {
            const s = iType(t.iTerm, g, i);
            switch (s.tag) {
                case 'vpi':
                    cType(t.cTerm, g, i, s.dom);
                    return s.cod(cEval(t.cTerm, {nameEnv: g.nameEnv, env: []}));
                default:
                    throw TypeError(`illegal application ${print(quote0(s))}`);
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

function iSort(t: CTerm, g: {nameEnv: NameEnv<Value>, env: Context}, i: number): Type|null {
    switch (t.tag) {
        case 'inf': return iType(t.inf, g, i);
        default: return null;
    }
}

//----------------------------------------------------------------------------
// Substitute

function iSubst(l: ITerm, r: ITerm, i: number): ITerm {
    switch(l.tag) {
        case 'ann': return Ann(cSubst(l.cTerm, r, i), cSubst(l.tTerm, r, i));
        case 'sort': return l;
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

//----------------------------------------------------------------------------
// Term eq, with PTS sort check.

export function iTermEq(l: ITerm, r: ITerm): boolean {
    if (l.tag === 'ann' && r.tag === 'ann') {
        return cTermEq(l.cTerm, r.cTerm) && cTermEq(l.tTerm, r.tTerm);
    } else if (l.tag === 'sort' && r.tag === 'sort') {
        return l.sort === r.sort
        || (l.sort === '' && pts.sorts.has(r.sort))
        || (r.sort === '' && pts.sorts.has(l.sort));
    } else if (l.tag === 'pi' && r.tag === 'pi') {
        return cTermEq(l.dom, r.dom) && cTermEq(l.cod, r.cod);
    } else if (l.tag === 'bound' && r.tag === 'bound') {
        return l.bound === r.bound;
    } else if (l.tag === 'free' && r.tag === 'free') {
        return nameEq(l.free, r.free);
    } else if (l.tag === 'app' && r.tag === 'app') {
        return iTermEq(l.iTerm, r.iTerm) && cTermEq(l.cTerm, r.cTerm);
    }
    return false;
}

export function cTermEq(l: CTerm, r: CTerm): boolean {
    if (l.tag === 'inf' && r.tag === 'inf') {
        return iTermEq(l.inf, r.inf);
    } else if (l.tag === 'lam' && r.tag === 'lam') {
        return cTermEq(l.lam, r.lam);
    }
    return false;
}
