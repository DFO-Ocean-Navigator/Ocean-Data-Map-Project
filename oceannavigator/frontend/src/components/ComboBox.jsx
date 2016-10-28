import React from 'react';
import $ from 'jquery';
import jQuery from 'jquery';
import {Modal, Button} from 'react-bootstrap';

class ComboBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            url: null
        };
    }

    handleChange(e) {
        var value = e.target.value;
        if (this.props.multiple) {
            value = [];
            var options = e.target.options;
            for (var i = 0, l = options.length; i < l; i++) {
                if (options[i].selected) {
                    value.push(options[i].value);
                }
            }
        }
        if (typeof(this.props.onUpdate) === "function") {
            this.props.onUpdate(this.props.id, value);
            var dataset = e.target.options[e.target.selectedIndex].dataset;
            for (var key in dataset) {
                this.props.onUpdate(this.props.id + '_' + key, dataset[key]);
            }
        }
    }
    populate(props) {
        this.setState({
            url: props.url
        });
        if ('url' in props && '' != props.url) {
            $.ajax({
                url: props.url,
                dataType: 'json',
                cache: false,
                success: function(data) {
                    var ids = data.map(function(d) {return d.id;});
                    if (
                            (this.props.state == '' && typeof(this.props.state) == "string") ||
                            this.props.state == 'none'
                       ) {
                        if (jQuery.inArray('none', ids) == -1) {
                            data.splice(0, 0, {'id': 'none', 'value': 'None'});
                        }
                    }
                    this.setState({
                        data: data,
                    });

                    var a = data.map(function(x) {
                        return x.id
                    });

                    var value = this.props.state;
                    var floatValue = parseFloat(value);

                    var notInList = false;
                    if (value instanceof Array) {
                        notInList = value.map((el) => jQuery.inArray(el, a) == -1 && jQuery.inArray(parseFloat(el), a) == -1).reduce((prev, cur) => prev || cur, false);
                    } else {
                        notInList = (jQuery.inArray(this.props.state, a) == -1 && jQuery.inArray(floatValue, a) == -1);
                    }
                    if (notInList || (this.props.state == '' && data.length > 0) || this.props.state == 'all') {
                        if (props.multiple) {
                            if (value == 'all') {
                                value = data.map(function (d) {
                                    return d.id;
                                });
                            } else if (!Array.isArray(value)) {
                                value = [value];
                            }
                        }
                    } else {
                        if (data.length == 0) {
                            value = props.def;
                        } else if (data.length == 1) {
                            value = props.def;
                        } else {
                            value = this.props.state;
                        }
                    }
                    if (data.length > 0 && !props.multiple && jQuery.inArray(value, a) == -1 && jQuery.inArray(floatValue, a) == -1) {
                        value = data[0].id;
                    }
                    if (typeof(this.props.onUpdate) === "function") {
                        props.onUpdate(props.id, value);
                        if (a.indexOf(value) != -1) {
                            var d = data[a.indexOf(value)];
                            for (var key in d) {
                                if (d.hasOwnProperty(key) && key != 'id' && key != 'value') {
                                    this.props.onUpdate(this.props.id + '_' + key, d[key]);
                                }
                            }
                        }
                    }
                }.bind(this),
                error: function(xhr, status, err) {
                    console.error(props.url, status, err.toString());
                }.bind(this)
            });
        } else {
            this.setState({
                data: props.data
            });
        }
    }
    componentDidMount() {
        this.populate(this.props)
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.url != this.state.url) {
            this.populate(nextProps);
        }
    }
    showHelp() {
        this.setState({
            showHelp: true
        });
    }
    closeHelp() {
        this.setState({
            showHelp: false
        });
    }
    render() {
        var options = this.state.data.map(function(o) {
            var opts = {
                key: o.id,
                value: o.id,
            }
            for (var key in o) {
                if (key == 'id' || key == 'value') continue;
                if (o.hasOwnProperty(key)) {
                    opts['data-' + key] = o[key];
                }
            }
            return React.createElement("option", opts, o.value);
        });

        if (this.state.data.length > 1) {
            var value = this.props.state;
            if (this.props.multiple && value == 'all') {
                value = this.state.data.map(function(d) {
                    return d.id;
                });
            }

            var hasHelp =
                (this.props.children != null && this.props.children.length > 0) ||
                this.state.data.slice(-1)[0].hasOwnProperty('help');

            var helpOptions = [];
            if (this.state.data.slice(-1)[0].hasOwnProperty('help')) {
                helpOptions = this.state.data.map(function(d) {
                    return (
                        <p key={d.id}><em>{d.value}</em>: <span dangerouslySetInnerHTML={{ __html: d.help}} /></p>
                           );
                });
            }

            return (
                    <div key={this.props.url} className='ComboBox input'>
                    <h1>
                    {this.props.title}
                    <span onClick={this.showHelp.bind(this)} style={{'display': hasHelp ? 'block' : 'none'}}>?</span>
                    </h1>

                    <Modal show={this.state.showHelp} onHide={this.closeHelp.bind(this)} bsSize="large" dialogClassName="helpdialog">
                        <Modal.Header closeButton>
                            <Modal.Title>{this.props.title} Help</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            {this.props.children}
                            {helpOptions}
                        </Modal.Body>
                        <Modal.Footer>
                            <Button onClick={this.closeHelp.bind(this)}>Close</Button>
                        </Modal.Footer>
                    </Modal>

                    <select
                    size={ Math.min(10, this.props.multiple ? this.state.data.length : 1) }
                    value={value}
                    onChange={this.handleChange.bind(this)}
                    multiple={this.props.multiple}>
                    {options}
                    </select>
                    </div>
                   );
        } else {
            return null;
        }
    }
}

export default ComboBox;

