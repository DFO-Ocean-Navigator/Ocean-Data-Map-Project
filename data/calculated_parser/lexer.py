#!/usr/bin/env python

import re

import numpy as np
import ply.lex as lex

import data.calculated_parser.functions as functions

# Intro to PLY: https://www.dabeaz.com/ply/PLYTalk.pdf


class Lexer:
    """This is the Lexer (or tokenizer) part of the domain specific language.
    It handles converting the input into a stream of tokens that the Parser
    will then parse."""

    def __init__(self, **kwargs):
        # a list of the tokens that are used in this language
        self.tokens = [
            'NUMBER',
            'PLUS',
            'MINUS',
            'TIMES',
            'DIVIDE',
            'POWER',
            'LPAREN',
            'RPAREN',
            'ID', # variable key OR function name (see below t_ID)
            'COMMA',
            'CONST', # math constant (see below t_CONST)
            'LBRKT',
            'RBRKT'
        ]

        # These tokens don't require any additional processing
        self.t_PLUS = '\\+'
        self.t_MINUS = '-'
        self.t_TIMES = '\\*'
        self.t_DIVIDE = '/'
        self.t_POWER = '\\^'
        self.t_LPAREN = '\\('
        self.t_RPAREN = '\\)'
        self.t_COMMA = ','
        self.t_LBRKT = '\\['
        self.t_RBRKT = '\\]'

        # Ignore tabs and spaces
        self.t_ignore = ' \t'

        # Empty set of variables that will get popualted as the expression is
        # tokenized
        self.variables = set()

        self.lexer = lex.lex(object=self, **kwargs)

    # these t_* methods can not have proper python docstrings, as that comment
    # field is used for the regular expression defining the token.

    # Constant token, currently can be "pi" or "e". The lexer replaces this
    # token with the numeric value of the constant, so the parser doesn't need
    # any knowledge of the constants.
    def t_CONST(self, t):
        """(pi|e)"""
        if t.value == 'pi':
            t.value = np.pi
        if t.value == 'e':
            t.value = np.e
        return t

    # Identifiers either function names or variable names
    def t_ID(self, t):
        """[a-zA-Z_][a-zA-Z_0-9]*"""
        regex = re.compile('[a-zA-Z][a-zA-Z_0-9]*')
        # Look at the functions defined in the functions module, if they match
        # the regular expression (start with upper or lower-case character, and
        # only contain alphanumeric characters, underscores, and the digits 0-9
        fnames = filter(regex.match, dir(functions))
        if t.value not in fnames:
            # If the token does not match a function in functions, then we add
            # it to the list of variables.
            self.variables.add(t.value)
        return t

    # Number Literals: one or more digits, optionally followed by . and one or
    # more digits.
    # eg: 0, 1, 123, 1.23
    # .123 is not valid, nor is 1.
    # 1.23e45 is also not valid, it must be expressed as 1.23 * 10 ^ 45
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
