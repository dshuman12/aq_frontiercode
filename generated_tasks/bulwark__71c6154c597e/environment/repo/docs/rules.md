# rule language

bulwark rules live in `*.cdn` files. a file contains one or more
`phase` blocks; each block contains zero or more `rule`s.

## skeleton

```
phase pre_route {
    rule <name> {
        when <expression>
        then <action>(<args...>)
    }
}
```

valid phases: `pre_route`, `post_route`, `response`.

## expressions

```
literal      → 42 | 3.14 | "string" | /^regex/ | true | false | null
path         → header.x-token | ident.client_ip | path | method | body.user.id
list         → [ expr (, expr)* ]
unary        → not expr
binary       → expr (and | or) expr
compare      → expr (== | != | < | <= | > | >=) expr
match        → expr matches /^regex/
member       → expr in [ ... ]
call         → ident(arg, ...)
```

precedence (tightest to loosest): unary > comparison > and > or.
relational ops are non-associative -- `a == b == c` is a syntax error.

## paths

| root      | values                                                 |
|-----------|--------------------------------------------------------|
| `path`    | the request path, after canonicalization               |
| `method`  | uppercased method                                      |
| `query.X` | first value of query parameter `X`, or `null`          |
| `header.X`| first value of header `X` (case-insensitive lookup)    |
| `cookie.X`| first value of cookie `X`                              |
| `body.X`  | json path into the request body (when content-type is json) |
| `ident.client_ip` | identity-extracted client ip                   |
| `ident.country`   | resolved country (when reputation feed loaded) |

## actions

| name       | meaning                                                |
|------------|--------------------------------------------------------|
| `allow()`  | short-circuit allow for this phase                     |
| `block(status=N, reason=S)` | reject with a synthetic response       |
| `tag(name=S, severity=S)`  | record a tag in the audit log           |
| `limit(key=expr, rate=S, burst=N)` | submit to the limiter           |
| `challenge(reason=S)` | issue a 401 with a nonce cookie             |

priority within a single phase, when multiple rules match: `block >
challenge > tag > allow`.

## comments

`#` starts a line comment.
