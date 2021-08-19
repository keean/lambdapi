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