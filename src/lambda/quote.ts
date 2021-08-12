import {Global, Local, Name, Quote} from '../common.ts';
import {App, Bound, CTerm, Free, Inf, ITerm, Lam, Neutral, Value, vfree } from './ast.ts';

export function boundfree(ii: number, n: Name): ITerm {
    switch (n.tag) {
        case 'quote':
            return Bound(ii - n.quote - 1);
        case 'local':
            return Free(Local(n.local));
        case 'global':
            return Free(Global(n.global));  
    }
}

export function neutralQuote(ii: number, x: Neutral): ITerm {
    switch (x.tag) {
        case 'nfree':
            return boundfree(ii, x.nfree);
        case 'napp':
            return App(neutralQuote(ii, x.neutral), quote(ii, x.value));
    }
}

export function quote(ii: number, x: Value): CTerm {
    switch (x.tag) {
        case 'vlam':
            return Lam(quote(ii + 1, x.vlam(vfree(Quote(ii)))));
        case 'vneutral':
            return Inf(neutralQuote(ii, x.vneutral));
    }
}

export function quote0(x: Value): CTerm {
    return quote(0, x);
}