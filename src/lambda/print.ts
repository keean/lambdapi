import {Type, nPrint, parensIf, vars} from '../common.ts';
import {ITerm, CTerm} from './ast.ts';

function tPrint(p: number, x: Type): string {
    switch (x.tag) {
        case 'tfree': return nPrint(x.tfree);
        case 'fun': return parensIf(p > 0, `${tPrint(0, x.dom)} -> ${tPrint(0, x.cod)}`);
    }
}

function iPrint(p: number, ii: number, x: ITerm): string {
    switch (x.tag) {
        case 'ann': return parensIf(p > 0, `${cPrint(2, ii, x.cTerm)} :: ${tPrint(0, x.type)}`);
        case 'bound': return vars(ii - x.bound - 1);
        case 'free': return nPrint(x.free);
        case 'app': return parensIf(p > 2, `${iPrint(2, ii, x.iTerm)} ${cPrint(3, ii, x.cTerm)}`);
    }
} 

function cPrint(p: number, ii: number, x: CTerm): string {
    switch (x.tag) {
        case 'inf': return iPrint(p, ii, x.inf);
        case 'lam': return parensIf(p > 0, `\\${vars(ii)} -> ${cPrint(0, ii + 1, x.lam)}`);
    }
}

export function print(x: CTerm): string {
    return cPrint(0, 0, x);
}

export function printType(t: Type): string {
    return tPrint(0, t);
}