import ply.lex as lex
import numpy as np
import re
import data.calculated_parser.functions as functions

class Lexer:

    def __init__(self, **kwargs):
        self.tokens = [
                'NUMBER',
                'PLUS',
                'MINUS',
                'TIMES',
                'DIVIDE',
                'POWER',
                'LPAREN',
                'RPAREN',
                'ID',
                'COMMA',
                'CONST'
                ]
        self.t_PLUS = '\\+'
        self.t_MINUS = '-'
        self.t_TIMES = '\\*'
        self.t_DIVIDE = '/'
        self.t_POWER = '\\^'
        self.t_LPAREN = '\\('
        self.t_RPAREN = '\\)'
        self.t_COMMA = ','
        self.t_ignore = ' \t'
        self.variables = set()
        self.lexer = lex.lex(object=self, **kwargs)

    def t_CONST(self, t):
        """(pi|e)"""
        if t.value == 'pi':
            t.value = np.pi
        if t.value == 'e':
            t.value = np.e
        return t

    def t_ID(self, t):
        """[a-zA-Z_][a-zA-Z_0-9]*"""
        regex = re.compile('f[0-9]_[a-zA-Z_][a-zA-Z_0-9]*')
        fnames = filter(regex.match, dir(functions))
        if t.value not in fnames:
            self.variables.add(t.value)
        return t

    def t_NUMBER(self, t):
        r"""\d+(\.\d+)?"""
        t.value = float(t.value)
        return t

    def t_newline(self, t):
        r"""\n+"""
        t.lexer.lineno += len(t.value)

    def t_error(self, t):
        print("Illegal character '%s'" % t.value[0])
        t.lexer.skip(1)

