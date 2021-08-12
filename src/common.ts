// Name

export type Global = {tag: 'global', global: string};
export function Global(global: string): Name {
    return {tag: 'global', global};
}

export type Local = {tag: 'local', local: number};
export function Local(local: number): Name {
    return {tag: 'local', local};
}

export type Quote = {tag: 'quote', quote: number};
export function Quote(quote: number): Name {
    return {tag: 'quote', quote};
}

export type Name = 
    | Global
    | Local
    | Quote
    ;

export function nameEq(x: Name, y: Name): boolean {
    if (x.tag === 'global' && y.tag === 'global') {
        return x.global === y.global;
    } else if (x.tag === 'local' && y.tag === 'local') {
        return x.local === y.local;
    } else if (x.tag === 'quote' && y.tag === 'quote') {
        return x.quote === y.quote;
    }
    return false;
}

export function nPrint(x: Name): string {
    switch (x.tag) {
        case 'global': return x.global;
        case 'local': return `Local(${String(x.local)})`;
        case 'quote': return `Quote(${String(x.quote)})`;
    }
}

// Type

type TFree = {tag: 'tfree', tfree: Name};
export function TFree(tfree: Name): Type {
    return {tag: 'tfree', tfree};
}

type Fun = {tag: 'fun', dom: Type, cod: Type}
export function Fun(dom: Type, cod: Type): Type {
    return {tag: 'fun', dom, cod};
}

export type Type = 
    | TFree 
    | Fun
    ;


export function typeEq(x: Type, y: Type): boolean {
    if (x.tag === 'tfree' && y.tag === 'tfree') {
        return nameEq(x.tfree, y.tfree);
    } else if (x.tag === 'fun' && y.tag === 'fun') {
        return typeEq(x.dom, y.dom) && typeEq(x.cod, y.cod);
    }
    return false;
}

// NameEnv

export type NameEnv<V> = {name: Name, value: V}[];

export function NameEnv<V>(): NameEnv<V> {
    return [];
}

export function nameGet<V>(nameEnv: NameEnv<V>, x: Name): V|undefined {
    return nameEnv.find(y => nameEq(y.name, x))?.value;
}

// Statement

export type Let<I> = {tag: 'let', name: string, term: I};
export function Let<I,TInf>(name: string, term: I): Statement<I,TInf> {
    return {tag: 'let', name, term};
}

export type Bind<TInf> = {tag: 'bind', name: string, info: TInf};
export function Bind<TInf>(name: string, info: TInf): Bind<TInf> {
    return {tag: 'bind', name, info};
}

export type Assume<TInf> = {tag: 'assume', assume: Bind<TInf>[]};
export function Assume<I,TInf>(assume: Bind<TInf>[]): Statement<I,TInf> {
    return {tag: 'assume', assume};
}

export type Eval<I> = {tag: 'eval', term: I};
export function Eval<I,TInf>(term: I): Statement<I,TInf> {
    return {tag: 'eval', term};
}

export type PutStrLn = {tag: 'putstrln', putstrln: string};
export function PutStrLn<I,TInf>(putstrln: string): Statement<I,TInf> {
    return {tag: 'putstrln', putstrln};
}

export type Out = {tag: 'out', out: string};
export function Out<I,TInf>(out: string): Statement<I,TInf> {
    return {tag: 'out', out};
}

export type Statement<I,TInf> = 
    | Let<I>
    | Assume<TInf>
    | Eval<I>
    | PutStrLn
    | Out
    ;


const cs = "xyzabcdefghijklmnopqrstuvw";

export function vars(n: number): string {
    const c = cs.charAt(n % 26);
    const m = (n / 26) | 0;
    return (m < 1) ? c : c + m;
}

export function parensIf(p:boolean, s:string): string {
    if (p) {
        return `(${s})`;
    } else {
        return s;
    }
}