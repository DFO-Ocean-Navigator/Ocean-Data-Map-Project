import React from "react";
import {FormControl, Row, Button, Form} from "react-bootstrap";
import PropTypes from "prop-types";
import Icon from "./Icon.jsx";

export default class CustomPlotLabels extends React.Component {

  constructor (props) {
    super(props);

    this.updateParent = this.updateParent.bind(this);
    this.updateState = this. updateState.bind(this);
    
    this.state = {
      userProvidedTitle: null   //Holds user defined plot title
    };
  }

  //Updates new title value as user types
  updateState(e) {
    this.setState({
      userProvidedTitle: e.target.value,  //Changes stored title value
    });
  }

  //Updates title on button click
  updateParent(e) {

    if (e.target.id === "titleBox") {
      e.preventDefault();
    }
    
    this.props.updatePlotTitle(this.state.userProvidedTitle); //Calls function in AreaWindow
  }

  render() {
    return (
      
      
      <div>
        
        <div className='plotTitleInput, input'>
          <div><h1>{this.props.title}</h1></div>
          <Row>
            <Form   //Keeps everything in the same row
              style={{
                paddingLeft: "15px",
                paddingRight: "15px",
              }}
              id="titleBox"
              onSubmit={this.updateParent}  //Calls when user hits enter
              inline
            >
          
              {/* Updated Plot Title Input Field*/}           
              <FormControl
                ref = {(input) => this.textInput = input}
                style = {{width: "83%"}}
                type="text"
                onChange={this.updateState}   //Updates as user types
                placeholder='Default'
              ></FormControl>
            
              {/* Update Plot Title Button */}          
              <Button
                style={{width: "17%"}}
                onClick={this.updateParent}   //Re-loads map on button click
              >
                <Icon icon="repeat" /> {/* button Icon */}
              </Button>
          
            </Form>
          </Row>
        </div>
      </div>
      
    );
  }
}

//***********************************************************************
CustomPlotLabels.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  updatePlotTitle: PropTypes.func,
};