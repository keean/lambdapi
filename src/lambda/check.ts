import {typeEq, Local, Name, Type} from '../common.ts'
import {Kind, ITerm, CTerm, Context, Ann, App, Inf, Lam, HasType, Free, Star, contextGet} from './ast.ts';

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

function cKind(t: Type, gamma: Context, k: Kind) {
    switch (t.tag) {
        case 'tfree': {
            const x = contextGet(gamma, t.tfree); 
            if (x?.tag !== 'haskind' || x.haskind?.tag !== k.tag) {
                unknownIdentifier(t.tfree);
            }
            break;
        }
        case 'fun': 
            cKind(t.dom, gamma, k);
            cKind(t.cod, gamma, k);
            break;
    }
}

export function iType0(t: ITerm, gamma: Context): Type {
    return iType(t, gamma, 0);
}

export function iType(t: ITerm, gamma: Context, i: number): Type {
    switch (t.tag) {
        case 'ann': {
            cKind(t.type, gamma, Star);
            cType(t.cTerm, gamma, i, t.type);
            return t.type;
        }
        case 'bound':
            throw TypeError('this should never happen');
        case 'free': {
            const x = contextGet(gamma, t.free);
            if (x?.tag !== 'hastype') {
                unknownIdentifier(t.free);
            }
            return x.hastype;
        }
        case 'app': {
            const s = iType(t.iTerm, gamma, i);
            switch (s.tag) {
                case 'fun':
                    cType(t.cTerm, gamma, i, s.dom);
                    return s.cod;
                default:
                    throw TypeError('illegal application');
            } 
        }
    }
}

function cType(t: CTerm, gamma: Context, i: number, ty: Type) {
    if (t.tag === 'inf') {
        const u = iType(t.inf, gamma, i);
        if (!typeEq(u, ty)) {
            throw TypeError(`${u} type mismatch ${ty}`);
        }
    } else if (t.tag === 'lam' && ty.tag === 'fun') {
        cType(
            cSubst(t.lam, Free(Local(i)), 0),
            [{name: Local(i), info: HasType(ty.dom)}, ...gamma],
            i + 1,
            ty.cod,
        );
    } else {
        throw TypeError(`${JSON.stringify(t)} type mismatch ${JSON.stringify(ty)}`);
    }
}

//----------------------------------------------------------------------------
// Substitute

function iSubst(l: ITerm, r: ITerm, i: number): ITerm {
    switch(l.tag) {
        case 'ann': return Ann(cSubst(l.cTerm, r, i), l.type);
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
