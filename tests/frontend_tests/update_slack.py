"""
Write test results to slack channel ui_tests
==========================
:Author: Samuel Babalola
:Created: 2020-03-11

"""

from datetime import datetime
import os
import slack

from dimension_config import open_config

# The slack library requires a defined pattern of writing
# messages. This is what this log_to_channel function does
# It rearranges the results from test_results.yaml to fit
# the index function below.


def log_to_channel(log_file):
    config = open_config(log_file)
    message = config['Test results']
    test_date = datetime.now()
    test_date = test_date.strftime("%A, %d. %B %Y %H:%M:%S")
    list_result = []
    for tests in message:
        if type(message[tests]) is str:
            result_format = f'[{test_date}] {tests} : {message[tests]}'
            result_index = index(result_format)
            list_result.append(result_index)
            continue

        for result in message[tests]:
            result_format = f'[{test_date}] {tests} - {result} : {message[tests][result]}.'
            result_index = index(result_format)
            list_result.append(result_index)

    return list_result


def index(input):
    blocks = {
        "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": input
                }
    }
    return blocks


def main():
    results = log_to_channel('test_results.yaml')
    slack_config = open_config('slack_token.yaml')
    slack_token = slack_config['token']
    client = slack.WebClient(token=slack_token)

    client.chat_postMessage(
        channel="ui-tests",
        blocks=results
    )


if '__main__' == __name__:
    main()
