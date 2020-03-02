#!/usr/bin/env python

import numpy as np
import ply.yacc as yacc

import data.calculated_parser.functions as functions
import data.calculated_parser.lexer


class Parser:
    """The parsing portion of the domain specific language"""

    def __init__(self, **kwargs):
        self.lexer = data.calculated_parser.lexer.Lexer()
        self.tokens = self.lexer.tokens

        # Sets the operator precedence for the parser. The unary minus is the
        # highest, followed by exponentiation, then multiplication/division and
        # addition/subtraction is last on the list.
        self.precedence = (
            ('left', 'PLUS', 'MINUS'),
            ('left', 'TIMES', 'DIVIDE'),
            ('left', 'POWER'),
            ('right', 'UMINUS'),
        )
        self.parser = yacc.yacc(module=self)
        self.data = None
        self.expression = None
        self.result = np.nan

    def parse(self, expression, data, key, dims):
        """Parse the expression and return the result

        Parameters:
        expression -- the string expression to parse
        data -- the xarray or netcdf dataset to pull data from
        key -- the key passed along from the __getitem__ call, a tuple of
               integers and/or slices
        dims -- the dimensions that correspond to the key, a list of strings

        Returns a numpy array of data.
        """
        self.data = data
        self.result = np.nan  # populated by p_statement_expr()
        self.key = key
        self.dims = dims
        self.expression = expression
        self.parser.parse(expression)
        self.data = None
        self.key = None
        self.dims = None
        return self.result

    def get_key_for_variable(self, variable):
        """Using self.key and self.dims, determine the key for the particular
        variable.

        Params:
        variable -- the xarray or netcdf variable

        Returns a tuple of integers and/or slices
        """
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

    def get_key_for_variable_full_depth(self, variable_key):
        variable = self.data.variables[variable_key]

        if 'depth' in variable_key:
            depth_levels = variable.shape[0]  # Expecting (depth shape)
            return (slice(0, depth_levels), )

        key = list(self.key)
        # Expecting (time, depth, lat, lon) shape
        depth_levels = variable.shape[1]
        key.insert(1, slice(0, depth_levels))

        return tuple(key)

    # Similar to the Lexer, these p_*, methods cannot have proper python
    # docstrings, because it's used for the parsing specification.
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

    def p_expression_variable_full_depth(self, t):
        '''expression : LBRKT ID RBRKT'''

        t[0] = self.data.variables[t[2]][
            self.get_key_for_variable_full_depth(t[2])
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
        if t[2] == '+':
            t[0] = t[1] + t[3]
        elif t[2] == '-':
            t[0] = t[1] - t[3]
        elif t[2] == '*':
            t[0] = t[1] * t[3]
        elif t[2] == '/':
            t[0] = t[1] / t[3]
        elif t[2] == '^':
            t[0] = t[1] ** t[3]

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
        raise SyntaxError(
            'Syntax error in equation: {}...{}'.format(self.expression, t))
