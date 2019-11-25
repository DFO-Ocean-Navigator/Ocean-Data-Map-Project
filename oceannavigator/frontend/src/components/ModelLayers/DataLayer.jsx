import React from 'react';
import ComboBox from "./ComboBox.jsx";
import { Panel, Row, Col, Button } from 'react-bootstrap';
import SelectBox from "./SelectBox.jsx";

export default class DataLayer extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            query: {
                "area": this.props.area,
                "interp": this.props.interp,
                "neighbours": this.props.neighbours,
                "projection": this.props.projection,
                "radius": this.props.radius,
                "time": this.props.time,
                "dataset": "giops_day",
                "variable": "criticaldepth",
                "depth": 0,
            },
        }
    }

    componentDidMount() {
        this._mounted = true
    }

    updateVariables(key, values) {
        if (typeof values[0] === 'string') { return }

        let query = this.state.query;
        query.variable = values[0]

        this.setState({
            query: query
        })
    }

    updateDataset(key, value) {
        if (typeof value === 'string') { return }

        let query = this.state.query;
        query.dataset = value[0];

        this.setState({
            query: query
        })
    }

    loadNextPlot() {
        let url = this.urlFromStateQuery('/api/v1.0/data/area/', this.state.query)
        self = this
        $.ajax({
            type: 'GET',
            dataType: 'json',
            url: url,
            success: function (result) {
                self.setState({
                    data: result
                })
            }
        })
    }


    render() {

        // Initialize each component
        let data_selection_panel = null;
        if (this._mounted) {
            console.warn("MOUNTED")
            const toggle_data = (
                <SelectBox
                    id='bath_only'
                    key='bath_only'
                    state={this.state.bath_only}
                    onUpdate={this.toggleBathymetry}
                    title={_("Bathymetry Only")}
                />
            )

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
                    multiple={false}
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

            // Add the components to an array in the correct order
            let data_selection = [toggle_data, select_dataset, select_variable, toggle_apply];



            // Create Panel with Panel Elements
            data_selection_panel = <Panel
                key='right_map'
                id='right_map'
                collapsible
                defaultExpanded
                header={_("Surface")}
                bsStyle='primary'
            >
                {data_selection}
            </Panel>
        }
        return (
            <div>
                {data_selection_panel}
            </div>
        )
        
    }
}