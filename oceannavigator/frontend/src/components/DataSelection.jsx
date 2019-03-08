import React from 'react';
import SelectBox from "./SelectBox.jsx";
import PropTypes from "prop-types";
import { stringify } from 'querystring';
import { Checkbox } from 'react-bootstrap'

export default class DataSelection extends React.Component {
    constructor(props) {
        super(props);

        let current_data
        let data = this.props.data
        console.warn("DATA SELECTION") 
        for (let key in data) {     // This nested looping should be ok because there should be no more than 10 loops overall
            console.warn("KEY: ", key)
            console.warn("DATA[KEY]: ", data[key])
            for (let dataset in data[key]) {
                console.warn("DATASET: ", dataset)
                for (let variable in data[key][dataset]) {
                    console.warn("VARIABLE: ", variable)

                }
            }
        }
        this.state = {
            current_data: []
        }

        this.dataChange = this.dataChange.bind(this);
    }



    dataChange(e) {
        console.warn("KEY: ", e.target.id)
        this.props.localUpdate(e.target.id)
    }


    render () {

        let data = this.props.data
        let select_boxes = []
        console.warn("DATA SELECTION") 
        for (let key in data) {     // This nested looping should be ok because there should be no more than 10 loops overall
            console.warn("KEY: ", key)
            console.warn("DATA[KEY]: ", data[key])
            for (let dataset in data[key]) {
                console.warn("DATASET: ", dataset)
                for (let variable in data[key][dataset]) {
                    console.warn("VARIABLE: ", variable)
                    let key_string = key.charAt(0).toUpperCase() + key.slice(1)
                    let dataset_string = dataset.charAt(0).toUpperCase() + dataset.slice(1)
                    let variable_string = variable.charAt(0).toUpperCase() + variable.slice(1)
                    if ([key, dataset, variable] === this.state.current_data) {
                        select_boxes.push(
                            <Checkbox
                                key={key+dataset+variable}
                                id={[key, dataset, variable]} 
                                onChange={this.dataChange}
                                checked={true}
                                //style={this.props.style}
                            >
                                {key_string + ':' + dataset_string + ':' + variable_string}
                            </Checkbox>)
                    } else {
                        select_boxes.push(
                            <Checkbox
                                key={key+dataset+variable}
                                id={[key, dataset, variable]} 
                                onChange={this.dataChange}
                                checked={false}
                                //style={this.props.style}
                            >
                                {key_string + ':' + dataset_string + ':' + variable_string}
                            </Checkbox>)
                    }
                    
                }
            }
        }

        return (
            <div>
                {select_boxes}
            </div>
        )
    }
}

DataSelection.propTypes = {
    data: PropTypes.object,
    localUpdate: PropTypes.func,
};
  