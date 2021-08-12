import {quotedString, constant, maybe, parens, singleton, tuple, First, Second, LMap, token, second, string, seqMap, many, many1, opt, OneOf, RMap, Parser, Fix, Either, Return, Compose, branch, Try, product} from '../deps.ts';
import {HasType, HasKind, Star, ITerm, Bound, Free, App, Inf, Lam, CTerm, Ann, Info} from './ast.ts';
import {Statement, Let, Assume, PutStrLn, Out, Eval, Fun, TFree, Global, Type, Bind} from '../common.ts';

//----------------------------------------------------------------------------
// Tokens

type Attr = string[];

const operatorBackslash: Parser<Attr,string> = token(string('\\'));
const operatorEqual: Parser<Attr,string> = token(string('='));
const operatorStar: Parser<Attr,string> = token(string('*'));
const operatorArrow: Parser<Attr,string> = token(string('->'));
const operatorColon2: Parser<Attr,string> = token(string('::'));
const keywordLet: Parser<Attr,string> = token(string('let'));
const keywordAssume: Parser<Attr,string> = token(string('assume'));
const keywordPutStrLn: Parser<Attr,string> = token(string('putStrLn'));
const keywordOut: Parser<Attr,string> = token(string('out'));

const identifier = token(RMap(([a, b]) => a + b.join(''), product(
    OneOf('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'),
    many(OneOf('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789_'))
))) as Parser<Attr, string>

//----------------------------------------------------------------------------
// Parser

export const parseType = Fix<Attr,Type>(type => Try(RMap(([t0, t1]) => t1 ? Fun(t0, t1) : t0, product(
    Either(RMap(x => TFree(Global(x)), identifier), parens(type)),
    Either(RMap(maybe, second(operatorArrow, type)), Return(_ => maybe()))
))));   

const parseInfo = Either(RMap(HasType, parseType), RMap(constant(HasKind(Star)), operatorStar));

const parseBinding = seqMap((x, _, t) => Bind(x, t), identifier, operatorColon2, parseInfo);

const parseBindings = Either(many1(parens(parseBinding)), RMap(singleton, parseBinding));

function parseLam(iterm: Parser<Attr,ITerm>): Parser<Attr,CTerm> {
    return Fix(lam => Compose(
        RMap(([xs, vars]:[Attr,Attr]) => tuple(xs, [...xs.reverse(), ...vars]),
            LMap(x => tuple(x,x), First(second(operatorBackslash, many1(identifier))))),
        RMap(([xs, t]) => xs.reduce(acc => Lam(acc), t), 
            Second(second(operatorArrow, parseCTerm0(iterm, lam))))
    ));
}

function parseCTerm0(iterm: Parser<Attr,ITerm>, lam: Parser<Attr,CTerm>): Parser<Attr,CTerm> {
    return Either(lam, RMap(Inf, iterm));
}

function parseCTerm3(iterm: Parser<Attr,ITerm>): Parser<Attr,CTerm> {
    return Either(Try(parens(parseLam(iterm))), RMap(Inf, parseITerm3(iterm)));
}

export const parseITerm0 = Fix<Attr,ITerm>(iterm => Try(Either(
    Try(seqMap((t, ty) => ty ? Ann(Inf(t), ty) : t,
        seqMap((t, ts) => ts.reduce(App, t), parseITerm3(iterm), many(parseCTerm3(iterm))),
        Either(RMap(maybe, second(operatorColon2, parseType)), Return(_ => maybe()))
    )),
    seqMap((t, ty) => Ann(t,ty), parens(parseLam(iterm)), second(operatorColon2, parseType))
)));

function parseITerm3(iterm: Parser<Attr,ITerm>): Parser<Attr,ITerm> {
    return Either(
        RMap(([vars, x]) => {
            const i = vars.indexOf(x);
            return (i >= 0) ? Bound(i) : Free(Global(x));
        }, product(Return((x:Attr) => x), identifier)),
        parens(iterm)
    );
}

export const parseStatement: Parser<Attr,Statement<ITerm,Info>> = branch(
    RMap(([x, t]) => Let(x, t), product(second(keywordLet, identifier), second(operatorEqual, parseITerm0))),
    RMap(x => Assume(x), second(keywordAssume, parseBindings)),
    RMap(x => PutStrLn(x), second(keywordPutStrLn, quotedString())),
    RMap(x => Out(x), second(keywordOut, opt(quotedString(), ''))),
    RMap(x => Eval(x), parseITerm0),
);
