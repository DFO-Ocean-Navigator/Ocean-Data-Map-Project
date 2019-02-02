import ply.yacc as yacc
import numpy as np

import data.calculated_parser.lexer
import data.calculated_parser.functions as functions


class Parser:
    def __init__(self, **kwargs):
        self.lexer = data.calculated_parser.lexer.Lexer()
        self.tokens = self.lexer.tokens
        self.precedence = (
            ('left','PLUS','MINUS'),
            ('left','TIMES','DIVIDE'),
            ('left','POWER'),
            ('right','UMINUS'),
            )
        self.parser = yacc.yacc(module=self)
        self.data = None
        self.result = np.nan

    def parse(self, expression, data, key, dims):
        self.data = data
        self.result = np.nan
        self.key = key
        self.dims = dims
        self.parser.parse(expression)
        self.data = None
        self.key = None
        self.dims = None
        return self.result

    def get_key_for_variable(self, variable):
        key = self.key
        if not isinstance(key, tuple):
            key = (key,)

        d = dict(zip(self.dims, key))
        try:
            if hasattr(variable, "dims"):
                # xarray calls it dims
                key = [d[k] for k in variable.dims]
            else:
                key = [d[k] for k in variable.dimensions]
        except KeyError:
            raise SyntaxError

        return tuple(key)

    def p_statement_expr(self, t):
        'statement : expression'
        self.result = t[1]

    def p_expression_variable(self, t):
        'expression : ID'
        t[0] = self.data.variables[t[1]][
                self.get_key_for_variable(
                    self.data.variables[t[1]]
                    )
                ]

    def p_expression_uop(self, t):
        '''expression : MINUS expression %prec UMINUS'''
        t[0] = -t[2]

    def p_expression_binop(self, t):
        '''expression : expression PLUS expression
                    | expression MINUS expression
                    | expression TIMES expression
                    | expression DIVIDE expression
                    | expression POWER NUMBER'''
        if t[2] == '+'  : t[0] = t[1] + t[3]
        elif t[2] == '-': t[0] = t[1] - t[3]
        elif t[2] == '*': t[0] = t[1] * t[3]
        elif t[2] == '/': t[0] = t[1] / t[3]
        elif t[2] == '^': t[0] = t[1] ** t[3]

    def p_expression_group(self, t):
        'expression : LPAREN expression RPAREN'
        t[0] = t[2]

    def p_expression_number(self, t):
        'expression : NUMBER'
        t[0] = t[1]

    def p_expression_const(self, t):
        'expression : CONST'
        t[0] = t[1]

    def p_expression_function(self, t):
        'expression : ID LPAREN arguments RPAREN'
        fname = t[1]
        arg_list = t[3]
        if fname in dir(functions):
            t[0] = getattr(functions, fname)(*arg_list)
        else:
            raise SyntaxError

    def p_arguments(self, t):
        'arguments : argument'
        t[0] = [t[1]]

    def p_arguments_1(self, t):
        'arguments : arguments COMMA argument'
        t[0] = t[1]
        t[1].append(t[3])

    def p_argument(self, t):
        'argument : expression'
        t[0] = t[1]

    def p_error(self, t):
        t[0] = None

