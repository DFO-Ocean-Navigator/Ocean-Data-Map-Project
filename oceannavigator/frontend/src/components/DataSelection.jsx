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
        
        for (let key in data) {     // This nested looping should be ok because there should be no more than 10 loops overall
            
            for (let index in data[key]) {
                for (let dataset in data[key][index]) {
                    for (let variable in data[key][index][dataset]) {
                        this.props.localUpdate(key + ',' + index + ',' + dataset + ',' + variable)
                    }
                }
            }
        }
        
       
        this.state = {
            current_data: []
        }

        this.dataChange = this.dataChange.bind(this);
    }



    dataChange(e) {
        this.props.localUpdate(e.target.id)
    }


    render () {

        let data = this.props.data
        let select_boxes = []
        for (let key in data) {     // This nested looping should be ok because there should be no more than 10 loops overall
            for (let index in data[key]) {
                for (let dataset in data[key][index]) {
                    for (let variable in data[key][index][dataset]) {
                        let key_string = key.charAt(0).toUpperCase() + key.slice(1)
                        let dataset_string = dataset.charAt(0).toUpperCase() + dataset.slice(1)
                        let variable_string = variable.charAt(0).toUpperCase() + variable.slice(1)
                        
                        if ([key, index, dataset, variable] === this.state.current_data) {
                            select_boxes.push(
                                <Checkbox
                                    key={key+index+dataset+variable}
                                    id={[key, index, dataset, variable]} 
                                    onChange={this.dataChange}
                                    checked={true}
                                    //style={this.props.style}
                                >
                                    {key_string + ':' + index + ':' + dataset_string + ':' + variable_string}
                                </Checkbox>)
                        } else {
                            select_boxes.push(
                                <Checkbox
                                    key={key+index+dataset+variable}
                                    id={[key, index, dataset, variable]} 
                                    onChange={this.dataChange}
                                    checked={false}
                                    //style={this.props.style}
                                >
                                    {key_string + ':' + index + ':' + dataset_string + ':' + variable_string}
                                </Checkbox>)
                        }
                        
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
  