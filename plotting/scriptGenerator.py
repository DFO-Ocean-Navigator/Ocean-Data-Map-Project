from io import BytesIO


def generatePython(url, scriptType: str) -> BytesIO:
    if "class4id" in url:
        var = "class4id"
    elif "drifter" in url:
        var = "drifter"
    else:
        var = "variable"
    query = url

    # format query for python, could do with regular expressions
    query = query.replace(',"', ',\n"')
    if "true" in query:
        query = query.replace("true", "1")
    if "false" in query:
        query = query.replace("false", "0")
    if "null" in query:
        query = query.replace("null", "None")

    with open(f"plotting/templates/python{scriptType}template.txt", "r") as f:
        template = str(f.read())

        if scriptType == "PLOT":
            template = template.format(q=query, var=var)
        else:
            template = template.format(q=query, var=var)

        finalScript = BytesIO()
        finalScript.write(bytes(template, "utf-8"))
        finalScript.seek(0)
        return finalScript


def generateR(url, scriptType: str) -> BytesIO:

    if "class4id" in url:
        var = "class4id"
    elif "drifter" in url:
        var = "drifter"
    else:
        var = "variable"
    query = url

    query = query.replace(',"', ',\n"')
    if "true" in query:
        query = query.replace("true", "1")
    if "false" in query:
        query = query.replace("false", "0")
    if "null" in query:
        query = query.replace("null", "None")

    with open(f"plotting/templates/r{scriptType}template.txt", "r") as f:
        template = str(f.read())

        if scriptType == "PLOT":
            template = template.format(q=query, var=var)
        else:
            template = template.format(q=query)

        finalScript = BytesIO()
        finalScript.write(bytes(template, "utf-8"))
        finalScript.seek(0)
        return finalScript
