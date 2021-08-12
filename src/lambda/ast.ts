import {Name, nameEq, Type} from '../common.ts';

// ITerm

export type Ann = {tag: 'ann', cTerm: CTerm, type: Type};
export function Ann(cTerm: CTerm, type: Type): ITerm {
    return {tag: 'ann', cTerm, type} 
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
    | Bound
    | Free
    | App
    ;

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

export type VLam = {tag: 'vlam', vlam: (x: Value) => Value};
export function VLam(vlam: (x: Value) => Value): Value {
    return {tag: 'vlam', vlam};
}

export type VNeutral = {tag: 'vneutral', vneutral: Neutral};
export function VNeutral(vneutral: Neutral): Value {
    return {tag: 'vneutral', vneutral};
}

export type Value =
    | VLam
    | VNeutral
    ;

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

export type Kind = {tag: 'star'};
export const Star: Kind = {tag: 'star'};

// Info

export type HasKind = {tag: 'haskind', haskind: Kind};
export function HasKind(haskind: Kind): Info {
    return {tag: 'haskind', haskind};
}

export type HasType = {tag: 'hastype', hastype: Type};
export function HasType(hastype: Type): Info {
    return {tag: 'hastype', hastype};
}

export type Info =
    | HasKind
    | HasType
    ;

export type Context = {name: Name, info: Info}[]

export function contextGet(context: Context, x: Name): Info|undefined {
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
    }
}