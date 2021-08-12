import {quotedString, maybe, parens, tuple, First, Second, LMap, token, second, string, seqMap, many, many1, opt, OneOf, RMap, Parser, Fix, Either, Return, Compose, branch, Try, product, choice} from '../deps.ts';
import {ITerm, Bound, Free, App, Inf, Lam, CTerm, Ann, Pi, Star} from './ast.ts';
import {Statement, Let, Assume, PutStrLn, Out, Eval, Global, Bind} from '../common.ts';

//----------------------------------------------------------------------------
// Tokens

type Attr = string[];

const operatorBackslash: Parser<Attr, string> = token(OneOf('\\λ'));
const operatorEqual: Parser<Attr, string> = token(string('='));
const operatorStar: Parser<Attr, string> = token(OneOf('*∗'));
const operatorArrow: Parser<Attr, string> = token(Either(OneOf('→'), string('->')));
const operatorColon2: Parser<Attr, string> = token(string('::'));
const keywordLet: Parser<Attr, string> = token(string('let'));
const keywordAssume: Parser<Attr, string> = token(string('assume'));
const keywordPutStrLn: Parser<Attr, string> = token(string('putStrLn'));
const keywordOut: Parser<Attr, string> = token(string('out'));
const keywordForall: Parser<Attr, string> = token(Either(OneOf('∀'), string('forall')));
const operatorPoint: Parser<Attr, string> = token(string('.'));

const identifier = token(seqMap((a, b, c) => a + b.join('') + c.join(''),
    OneOf('ΑαΒβΓγΔδΕεΖζΗηΘθΙιΚκΛΜμΝνΞξΟοΠπΡρΣσςΤτΥυΦφΧχΨψΩωabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'),
    many(OneOf('ΑαΒβΓγΔδΕεΖζΗηΘθΙιΚκΛΜμΝνΞξΟοΠπΡρΣσςΤτΥυΦφΧχΨψΩωαabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789_')),
    many(OneOf("ΑαΒβΓγΔδΕεΖζΗηΘθΙιΚκΛΜμΝνΞξΟοΠπΡρΣσςΤτΥυΦφΧχΨψΩωαabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789'"))
)) as Parser<Attr, string>;

//----------------------------------------------------------------------------
// Parser

function unzip<A,B>(xs: [A,B][]): [A[], B[]] {
    return xs.reduce(([ls,rs]: [A[],B[]], [l,r]: [A,B]) => tuple([l, ...ls], [r, ...rs]), tuple([], []));
}

function zip<A>([ls,rs]:[string[], A[]]): Bind<A>[] {
    const s = Math.min(ls.length, rs.length);
    const xs = new Array<Bind<A>>(s);
    for (let i = 0; i < s; ++i) {
        xs[i] = Bind(ls[i], rs[i]);
    }
    return xs;
}

function parseBinding(iterm: Parser<Attr,ITerm>, lam: Parser<Attr,CTerm>, b: boolean): Parser<Attr,[string,CTerm]> {
    return seqMap((x:string, _, t:CTerm) => tuple(x, t), 
        identifier,
        operatorColon2,
        LMap((e: Attr) => b ? e : [], parseCTerm0(iterm, lam))
    );
}

function parseBindings(iterm: Parser<Attr,ITerm>, lam: Parser<Attr,CTerm>, b: boolean): Parser<Attr,[string[],CTerm[]]> {
    return RMap(([xt, e]:[[string, CTerm][], Attr]) => {
            const [xs, ts] = unzip(xt);
            return [[...xs.reverse(), ...e], ts.reverse()];
        }, LMap(e => tuple(e, e), First(Either(
        many1(parens(parseBinding(iterm, lam, b))),
        RMap(x => [x], parseBinding(iterm, lam, true))
    ))));
}
    
function parseLam(iterm: Parser<Attr,ITerm>): Parser<Attr,CTerm> {
    return Fix(lam => Compose(
        RMap(([xs, e]:[string[], string[]]) => tuple(xs, [...xs.reverse(), ...e]),
            LMap(e => tuple(e, e), First(second(operatorBackslash, many1(identifier))))),
        RMap(([xs, t]:[string[], CTerm]) => xs.reduce(acc => Lam(acc), t), 
            Second(second(operatorArrow, parseCTerm0(iterm, lam))))
    ));
}

function parseCTerm0(iterm: Parser<Attr,ITerm>, lam: Parser<Attr,CTerm>): Parser<Attr,CTerm> {
    return Either(lam, RMap(Inf, iterm));
}

function parseCTerm3(iterm: Parser<Attr,ITerm>): Parser<Attr,CTerm> {
    return Either(Try(parens(parseLam(iterm))), RMap(Inf, parseITerm3(iterm)));
}

export const parseITerm0: Parser<Attr, ITerm> = Fix(iterm => choice(
    RMap(([u, [t, ...ts]]) => ts.reduce((acc, x) => Pi(x, Inf(acc)), Pi(t, u)), Compose(
        second(keywordForall, parseBindings(iterm, parseLam(iterm), true)),
        First(second(operatorPoint, parseCTerm0(iterm, parseLam(iterm))))
    )),
    Try(seqMap((t, u) => (u !== null) ? Pi(Inf(t), u) : t,
        parseITerm1(iterm),
        Either(RMap(maybe, second(operatorArrow, LMap((x:Attr) => ['', ...x], parseCTerm0(iterm, parseLam(iterm))))), Return(_ => maybe()))
    )),
    seqMap(Pi,
        parens(parseLam(iterm)),
        second(operatorArrow, LMap((x:Attr) => ['', ...x], parseCTerm0(iterm, parseLam(iterm))))
    )
));

export function parseITerm1(iterm: Parser<Attr, ITerm>): Parser<Attr, ITerm> {
    return Either(
        Try(seqMap((t, u) => (u !== null) ? Ann(Inf(t), u) : t,
            parseITerm2(iterm),
            Either(RMap(maybe, second(operatorColon2, parseCTerm0(iterm, parseLam(iterm)))), Return(_ => maybe()))
        )),
        seqMap(Ann,
            parens(parseLam(iterm)),
            second(operatorColon2, parseCTerm0(iterm, parseLam(iterm)))
        )
    );
}

export function parseITerm2(iterm: Parser<Attr, ITerm>): Parser<Attr, ITerm> {
    return seqMap((t, ts) => ts.reduce(App, t),
        parseITerm3(iterm),
        many(parseCTerm3(iterm))
    );
}

function parseITerm3(iterm: Parser<Attr,ITerm>): Parser<Attr,ITerm> {
    return choice(
        RMap(_ => Star(), operatorStar),
        //RMap(toNat, integer),
        RMap(([vars, x]) => {
            const i = vars.indexOf(x);
            return (i >= 0) ? Bound(i) : Free(Global(x));
        }, product(Return((x:Attr) => x), identifier)),
        parens(iterm)
    );
}

export const parseStatement: Parser<Attr,Statement<ITerm,CTerm>> = branch(
    RMap(([x, t]) => Let(x, t), product(second(keywordLet, identifier), second(operatorEqual, parseITerm0))),
    RMap(x => Assume(x), RMap(zip, second(keywordAssume, parseBindings(parseITerm0, parseLam(parseITerm0), false)))),
    RMap(x => PutStrLn(x), second(keywordPutStrLn, quotedString())),
    RMap(x => Out(x), second(keywordOut, opt(quotedString(), ''))),
    RMap(x => Eval(x), parseITerm0),
);
