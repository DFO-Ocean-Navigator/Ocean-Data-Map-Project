import React from 'react';
import $ from 'jquery';
import jQuery from 'jquery';
import dateFormat from 'dateformat';

import 'jquery-ui-css/base.css';
import 'jquery-ui-css/datepicker.css';
import 'jquery-ui-css/theme.css';
import 'jquery-ui/datepicker';
import 'jquery-ui/button';
import 'jquery-ui-month-picker/MonthPicker.css';
import 'jquery-ui-month-picker/MonthPicker.js';

class TimePicker extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            map: {},
            revmap: {},
            times: [],
        };
    }
    populate(props) {
        if ('url' in props && '' != props.url) {
            $.ajax({
                url: props.url,
                dataType: 'json',
                cache: false,
                success: function(data) {
                    var map = {};
                    var revmap = {};
                    var min = 0;
                    var max = data.length - 1;
                    if (props.hasOwnProperty('min')) {
                        min = parseInt(props.min) + 1;
                        if (min < 0) {
                            min += data.length;
                        }
                    }
                    if (props.hasOwnProperty('max')) {
                        max = parseInt(props.max) - 1;
                        if (max < 0) {
                            max += data.length;
                        }
                    }
                    for (var d in data) {
                        map[data[d].id] = data[d].value;
                        revmap[data[d].value] = data[d].id;
                    }
                    this.setState({
                        data: data,
                        map: map,
                        revmap: revmap,
                    });
                    this.pickerChange();

                    var picker;
                    switch(props.quantum) {
                        case 'month':
                            picker = $(this.refs.picker).MonthPicker({
                                Button: false,
                                MonthFormat: "MM yy",
                                OnAfterMenuClose: this.pickerChange.bind(this),
                                MinMonth: map[min],
                                MaxMonth: map[max],
                            });
                            break;
                        case 'day':
                            picker = $(this.refs.picker).datepicker({
                                Button: false,
                                dateFormat: "dd MM yy",
                                onClose: this.pickerChange.bind(this),
                                minDate: new Date(map[min]),
                                maxDate: new Date(map[max]),
                            });
                            $(this.refs.picker).datepicker("option", "minDate", new Date(map[min]));
                            $(this.refs.picker).datepicker("option", "maxDate", new Date(map[max]));
                            break;
                        case 'hour':
                            picker = $(this.refs.picker).datepicker({
                                Button: false,
                                dateFormat: "dd MM yy",
                                onClose: this.pickerChange.bind(this),
                                minDate: new Date(map[min]),
                                maxDate: new Date(map[max]),
                            });
                            $(this.refs.picker).datepicker("option", "minDate", new Date(map[min]));
                            $(this.refs.picker).datepicker("option", "maxDate", new Date(map[max]));
                            break;
                    }
                }.bind(this),
                error: function(xhr, status, err) {
                    console.error(props.url, status, err.toString());
                }.bind(this)
            });
        }
    }
    componentDidMount() {
        this.populate(this.props);
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.url != this.props.url ||
            nextProps.min != this.props.min ||
            nextProps.max != this.props.max) {
            this.populate(nextProps);
        }
    }
    pickerChange() {
        var min = 0;
        var max = -1;
        if (this.props.hasOwnProperty('min')) {
            min = parseInt(this.props.min) + 1;
        }
        if (this.props.hasOwnProperty('max')) {
            max = parseInt(this.props.max) - 1;
        }
        if (min < 0) {
            min += this.state.data.length;
        }
        if (max < 0) {
            max += this.state.data.length;
        }

        if (this.props.quantum == 'hour') {
            var times = [];
            for (var i in this.state.data) {
                if (this.state.data[i].value.indexOf(this.refs.picker.value) == 0) {
                    if (this.state.data[i].id <= max && this.state.data[i].id >= min) {
                        times.unshift({
                            id: this.state.data[i].id,
                            value: dateFormat(new Date(this.state.data[i].value), "HH:MM")
                        });
                    }
                }
            }
            this.setState({
                times: times,
            });
            this.props.onUpdate(this.props.id, times[0].id);
        } else if (this.refs.picker != null) {
            this.props.onUpdate(this.props.id, this.state.revmap[this.refs.picker.value]);
        }
    }
    timeChange(e) {
        var value = e.target.value;
        this.setState({
            value: value
        });
        this.props.onUpdate(this.props.id, value);
    }
    datePickerChange(jsDate, dateString) {
        console.log(jsDate, dateString);
    }
    render() {
        var date;
        var value = parseInt(this.props.state);

        if (value < 0) {
            value += this.state.data.length;
        }

        if (value < 0) {
            value = 0;
        }

        // if (Object.keys(this.state.map).length == 0) {
        //     console.log("No map");
        //     return null;
        // } else {
        //     console.log(Object.keys(this.state.map).length, this.state.map);
        // }
        // console.log(this.props.state, value, this.state.map[value]);
        date = new Date(this.state.map[value]);
        var input = "";
        switch(this.props.quantum) {
            case 'month':
                input = <input readOnly ref='picker' type="text" value={$.datepicker.formatDate("MM yy", date)} />;
                break;
            case 'day':
            case 'hour':
                input = <input readOnly ref='picker' type="text" value={$.datepicker.formatDate("dd MM yy", date)} />;
                break;
        }

        var timeinput = "";
        var options = this.state.times.map(function (t) {
            return (
                <option key={t.id} value={t.id}>
                    {t.value}
                </option>
            );
        });
        if (this.props.quantum == 'hour') {
            timeinput = <select
                            value={this.state.value}
                            onChange={this.timeChange.bind(this)}>
                                {options}
                        </select>;
        }

        return (
            <div key={this.props.url} className='TimePicker input'>
                <h1>{this.props.title}</h1>

                {input}
                {timeinput}

            </div>
        );
    }
}

export default TimePicker;
