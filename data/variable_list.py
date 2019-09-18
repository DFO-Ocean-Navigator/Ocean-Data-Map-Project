#!/usr/bin/env python

from data.variable import Variable


class VariableList(list):

    def __getitem__(self, pos) -> Variable:
        if isinstance(pos, str):
            for v in self:
                if v.key == pos:
                    return v
            raise IndexError("%s not found in variable list" % pos)
        elif isinstance(pos, Variable):
            return self[pos.key]
        else:
            return super(VariableList, self).__getitem__(pos)

    def __contains__(self, key):
        if isinstance(key, str):
            for v in self:
                if v.key == key:
                    return True
            return False
        else:
            return super(VariableList, self).__contains__(key)
