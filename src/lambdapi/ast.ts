import {Name, nameEq} from '../common.ts';

// ITerm

export type Ann = {tag: 'ann', cTerm: CTerm, tTerm: CTerm};
export function Ann(cTerm: CTerm, tTerm: CTerm): ITerm {
    return {tag: 'ann', cTerm, tTerm} 
}

export type Sort = {tag: 'sort', sort: string};
export function Sort(sort: string): ITerm {
    return {tag: 'sort', sort};
}

export type Pi = {tag: 'pi', dom: CTerm, cod: CTerm};
export function Pi(dom: CTerm, cod: CTerm): ITerm {
    return {tag: 'pi', dom, cod};
}

export type Bound = {tag: 'bound', bound: number};
export function Bound(bound: number): ITerm {
    return {tag: 'bound', bound};
}

export type Free = {tag: 'free', free: Name};
export function Free(free: Name): ITerm {
    return {tag: 'free', free};
}

export type App = {tag: 'app', iTerm: ITerm, cTerm: CTerm};
export function App(iTerm: ITerm, cTerm: CTerm): ITerm {
    return {tag: 'app', iTerm, cTerm};
}

export type ITerm =
    | Ann
    | Sort
    | Pi
    | Bound
    | Free
    | App
    ;

export function Star(): ITerm {
    return Sort('*');
}

export function Box(): ITerm {
    return Sort('?');
}

export function iTermEq(l: ITerm, r: ITerm): boolean {
    if (l.tag === 'ann' && r.tag === 'ann') {
        return cTermEq(l.cTerm, r.cTerm) && cTermEq(l.tTerm, r.tTerm);
    } else if (l.tag === 'sort' && r.tag === 'sort') {
        return l.sort === r.sort;
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

// CTerm

export type Inf = {tag: 'inf', inf: ITerm};
export function Inf(inf: ITerm): CTerm {
    return {tag: 'inf', inf};
}

export type Lam = {tag: 'lam', lam: CTerm};
export function Lam(lam: CTerm): CTerm {
    return {tag: 'lam', lam};
}

export type CTerm = 
    | Inf
    | Lam
    ;

export function cTermEq(l: CTerm, r: CTerm): boolean {
    if (l.tag === 'inf' && r.tag === 'inf') {
        return iTermEq(l.inf, r.inf);
    } else if (l.tag === 'lam' && r.tag === 'lam') {
        return cTermEq(l.lam, r.lam);
    }
    return false;
}

// Value

export type VLam = {tag: 'vlam', vlam: (_: Value) => Value};
export function VLam(vlam: (_: Value) => Value): Value {
    return {tag: 'vlam', vlam};
}

export type VSort = {tag: 'vsort', vsort: string};
export function VSort(vsort: string): Value {
    return {tag: 'vsort', vsort};
}

export type VPi = {tag: 'vpi', dom: Value, cod: (_:Value) => Value};
export function VPi(dom: Value, cod: (_:Value) => Value): Value {
    return {tag: 'vpi', dom, cod};
}

export type VNeutral = {tag: 'vneutral', vneutral: Neutral};
export function VNeutral(vneutral: Neutral): Value {
    return {tag: 'vneutral', vneutral};
}

export type Value =
    | VLam
    | VSort
    | VPi
    | VNeutral
    ;

export function VStar() {
    return VSort('*');
}

export function VBox() {
    return VSort('?');
}

// Neutral

export type NFree =  {tag: 'nfree', nfree: Name};
export function NFree(nfree: Name): Neutral {
    return {tag: 'nfree', nfree};
}

export type NApp = {tag: 'napp', neutral: Neutral, value: Value};
export function NApp(neutral: Neutral, value: Value): Neutral {
    return {tag: 'napp', neutral, value};
}

export type Neutral =
    | NFree
    | NApp
    ;

export type Type = Value;
export type Context = {name: Name, info: Type}[]

export function contextGet(context: Context, x: Name): Type|undefined {
    return context.find(y => nameEq(y.name, x))?.info;
}

export type Env = Value[];

export function vfree(name: Name): Value {
    return {tag: 'vneutral', vneutral: {tag: 'nfree', nfree: name}};
}

export function vapp(u: Value, value: Value): Value {
    switch (u.tag) {
        case 'vlam': return u.vlam(value);
        case 'vneutral': return {tag: 'vneutral', vneutral: {tag: 'napp', neutral: u.vneutral, value}};
        default:
            throw "unimplemented";
    }
}