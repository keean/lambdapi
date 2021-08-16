import {nPrint, parensIf, vars} from '../common.ts';
import {ITerm, CTerm} from './ast.ts';

export function iPrint(p: number, ii: number, x: ITerm): string {
    switch (x.tag) {
        case 'ann': return parensIf(p > 1, `${cPrint(2, ii, x.cTerm)} :: ${cPrint(0, ii, x.tTerm)}`);
        case 'sort': return x.sort;
        case 'pi': if (x.cod.tag === 'inf' && x.cod.inf.tag === 'pi') {
            return parensIf(p > 0, nestedForall(ii + 2, [[ii + 1, x.cod.inf.dom], [ii, x.dom]], x.cod.inf.cod));
        } else {
            return parensIf(p > 0, `∀${vars(ii)} :: ${cPrint(0, ii, x.dom)}.${cPrint(0, ii + 1, x.cod)}`);
        }
        case 'bound': return vars(ii - x.bound - 1);
        case 'free': return nPrint(x.free);
        case 'app': return parensIf(p > 2, `${iPrint(2, ii, x.iTerm)} ${cPrint(3, ii, x.cTerm)}`);
    }
} 

function cPrint(p: number, ii: number, x: CTerm): string {
    switch (x.tag) {
        case 'inf': return iPrint(p, ii, x.inf);
        case 'lam': return parensIf(p > 0, `λ${vars(ii)} → ${cPrint(0, ii + 1, x.lam)}`);
    }
}

export function print(x: CTerm): string {
    return cPrint(0, 0, x);
}

function nestedForall(ii: number, ds: [number, CTerm][], x: CTerm): string {
    if (x.tag === 'inf' && x.inf.tag === 'pi') {
        return nestedForall(ii + 1, [[ii, x.inf.dom], ...ds], x.inf.cod);
    } else {
        return '∀' + ds.reverse().map(([n,d]) => `(${vars(n)} :: ${cPrint(0, n, d)})`).join(' ') + '.' + cPrint(0, ii, x);
    }
}
