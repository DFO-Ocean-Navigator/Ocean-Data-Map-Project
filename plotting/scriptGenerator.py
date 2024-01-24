from io import BytesIO


def generatePython(url: str, plot_type: str, script_Type: str) -> BytesIO:
    if "class4id" in url:
        var = "class4id"
        fname = '"ONAV_PLOT_" + str(query["class4type"]) + "_" + str(query["class4id"])'
    elif "drifter" in url:
        var = "drifter"
    else:
        var = "variable"
        fname = '"ONAV_PLOT_" + str(query["dataset"]) + "_" + str(query["variable"])'
    query = url

    # format query for python, could do with regular expressions
    query = query.replace(',"', ',\n"')
    if "true" in query:
        query = query.replace("true", "1")
    if "false" in query:
        query = query.replace("false", "0")
    if "null" in query:
        query = query.replace("null", "None")

    

    with open(f"plotting/templates/python_{script_Type}_template.txt", "r") as f:
        template = str(f.read())

        if script_Type == "plot":
            template = template.format(q=query, p=plot_type, var=var, f=fname)
        elif script_Type == "csv":
            template = template.format(q=query, p=plot_type, var=var, f=fname)
        else:
            template = template.format(q=query, var=var, f=fname)

        finalScript = BytesIO()
        finalScript.write(bytes(template, "utf-8"))
        finalScript.seek(0)
        return finalScript


def generateR(url, plot_type: str, script_Type: str) -> BytesIO:

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

    with open(f"plotting/templates/r_{script_Type}_template.txt", "r") as f:
        template = str(f.read())

        if script_Type == "plot":
            template = template.format(q=query, p=plot_type, var=var)
        elif script_Type == "csv":
            template = template.format(q=query, p=plot_type, var=var)
        else:
            template = template.format(q=query)

        finalScript = BytesIO()
        finalScript.write(bytes(template, "utf-8"))
        finalScript.seek(0)
        return finalScript
