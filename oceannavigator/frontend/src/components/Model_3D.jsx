import React from 'react';
import ComboBox from "./ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';

const stringify = require("fast-stable-stringify");
const i18n = require("../i18n.js");

export default class Model_3D extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            next_query: {
                "area": this.props.area,
                "datasets": {
                    [this.props.dataset]: {
                        "quantum": "day",
                        "variables": {
                            [this.props.variable]: {
                                scale: 'default',
                                colormap: 'default',
                            }
                        }
                    }
                },
                "interp": this.props.interp,
                "neighbours": this.props.neighbours,
                "projection": this.props.projection,
                "radius": this.props.radius,
                "time": this.props.time,
            },
            dataset: this.props.dataset,
            variables: this.props.variable
        }

        this.urlFromStateQuery = this.urlFromStateQuery.bind(this);
        this.loadNextPlot = this.loadNextPlot.bind(this);
        this.updateVariables = this.updateVariables.bind(this);
        this.updateDataset = this.updateDataset.bind(this);
    }

    componentDidMount() {
        this.loadNextPlot();
        this._mounted = true;
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.dataset !== this.state.dataset) {
            this.updateVariables('variable', [this.state.variables]);
        }
    }

    updateVariables(key, values) {
        console.warn("KEY: ", key);
        console.warn("VALUE: ", values);
        let dataset = this.state.dataset;

        if (dataset === undefined || this.state.next_query.datasets[dataset] === undefined) {
            this.setState({
                variables: values[0]
            })
            return;
        }
        let next_query = this.state.next_query;
        console.warn("NEXT QUERY: ", next_query)

        let variables = next_query.datasets[dataset].variables

        let var_template = {
            scale: 'default',
            colormap: 'default',
        }

        let new_variables = {}
        for (let variable in values) {
            console.warn("Variable: ", variable);
            variable = values[variable];
            if (variable in variables) {
                new_variables[variable] = variables[variable];
            } else {
                new_variables[variable] = var_template;
                //new_variables[variable].scale = values[1][variable]
            }
        }

        next_query.datasets[dataset].variables = new_variables;

        this.setState({
            variables: values[0],
            next_query: next_query
        })
    }

    updateDataset(key, value) {
        if (value === 'string') {
            return
        }
        console.warn("UPDATING DATASET:", key, value);
    
        let datasets = this.state.next_query.datasets;
        let old_dataset_obj = datasets[this.state.dataset];
        
        delete datasets[this.state.dataset];
        
        datasets[value[0]] = old_dataset_obj;
        datasets[value[0]].quantum = value[2];

        let next_query = this.state.next_query;
        next_query.datasets = datasets;
        
        this.setState({
            dataset: value[0],
            next_query: next_query
        })
        
    }

    loadNextPlot() {
        this.setState({
            query: this.state.next_query,
            url: this.urlFromStateQuery(this.state.next_query)
        })
    }

    urlFromStateQuery(query) {
        return "/api/v1.0/3d_model/?query=" + encodeURIComponent(stringify(query));
    }

    render() {
        let content = []
        // Create all the components individually that need to be added to panels
        if (this._mounted) {
            const select_dataset = (
                <ComboBox
                    key='dataset'
                    id='dataset'
                    state={this.state.dataset}
                    def=''
                    url='/api/v1.0/datasets/'
                    title={_("Dataset")}
                    onUpdate={this.updateDataset}
                />
            )

            const select_variable = (
                <ComboBox
                    id='variable'
                    key='variable'
                    multiple={true}
                    state={this.state.variables}
                    def={"defaults.dataset"}
                    onUpdate={this.updateVariables}
                    url={"/api/v1.0/variables/?vectors&dataset=" + this.state.dataset
                    }
                    title={_("Variables")}
                />
            )

            const toggle_apply = (
                <Button
                    onClick={this.loadNextPlot}
                >Apply</Button>
            )

            // Create Arrays holding all the components for each panel
            let data_selection = [select_dataset, select_variable, toggle_apply];

            // Create the panels if their associated arrays are not of length 0
            let data_selection_panel = <Panel
                key='right_map'
                id='right_map'
                collapsible
                defaultExpanded
                header={_("Right Map")}
                bsStyle='primary'
            >
                {data_selection}
            </Panel>

            // Load Plot to render

            let plot = <iframe src={this.state.url} frameBorder="0" style={{ width: '100%', height: '100%' }}></iframe>

            content = <Row style={{ height: '100%' }}>
                <Col lg={2} style={{ height: '100%' }}>
                    {data_selection_panel}
                </Col>
                <Col lg={8} style={{ height: '100%' }}>
                    <div style={{ height: '100%', width: '100%' }}>
                        {plot}
                    </div>
                </Col>
            </Row>
        }


        return (
            <div style={{ height: "100%" }}>
                {content}
            </div>
        )
    }
}