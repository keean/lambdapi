import {Global, Local, Name, Quote} from '../common.ts';
import {App, Bound, CTerm, Free, Inf, ITerm, Lam, Neutral, Pi, Sort, Value, vfree } from './ast.ts';

export function boundfree(ii: number, n: Name): ITerm {
    switch (n.tag) {
        case 'quote': return Bound(Math.max(ii - n.quote - 1, 0));
        case 'local': return Free(Local(n.local));
        case 'global': return Free(Global(n.global));  
    }
}

export function neutralQuote(ii: number, x: Neutral): ITerm {
    switch (x.tag) {
        case 'nfree': return boundfree(ii, x.nfree);
        case 'napp': return App(neutralQuote(ii, x.neutral), quote(ii, x.value));
    }
}

export function quote(ii: number, x: Value): CTerm {
    switch (x.tag) {
        case 'vlam': return Lam(quote(ii + 1, x.vlam(vfree(Quote(ii)))));
        case 'vneutral': return Inf(neutralQuote(ii, x.vneutral));
        case 'vsort': return Inf(Sort(x.vsort));
        case 'vpi': return Inf(Pi(quote(ii, x.dom), quote(ii + 1, x.cod(vfree(Quote(ii))))));
    }
}

export function quote0(x: Value): CTerm {
    return quote(0, x);
}