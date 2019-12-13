import React from 'react';

const stringify = require("fast-stable-stringify");
const i18n = require("../../i18n.js");
const LOADING_IMAGE = require("../../images/spinner.gif");
const FAIL_IMAGE = require("../fail.js");

export default class  extends React.Component {

    constructor (props) {
        super (props);

        this.state = {
            
        }

        this.loadImage = this.loadImage.bind(this);
    }


    componentDidMount () {
        console.warn("COMPONENT MOUNTING")
        if (this.props.corners !== undefined) {
            
            let query = {
                points: [this.props.corners]//[[51.35531765447794, -49.211058497428894], [51.39920197206365, -47.52356278896332], [50.24439496210104, -47.4532459974289], [50.0641879487261, -49.49230420589448], [51.35531765447794, -49.211058497428894]]
            }

            this.loadImage(query);
        }
    }


    componentDidUpdate (prevProps, prevState) {
        if (prevProps.corners !== this.props.corners) {
            let query = {
                points: [this.props.corners]
            }
            this.loadImage(query);
        }
    }

    loadImage(query) {
        console.warn("LOAD IMAGE: ", query);
        const paramString = $.param({
          query: stringify(query),
          format: "json",
        });
    
    
        this.setState({
          loading: true, 
          fail: false, 
          //url: LOADING_IMAGE,
          paramString: paramString,
          errorMessage: null,
        });
          
        let url = '/api/v1.0/map/area/';
          
          const promise = $.ajax({
            url: url,
            cache: true,
            data: paramString,
            dataType: "json",
            method: (paramString.length < 1536) ? "GET" : "POST",
          }).promise();
    
          promise.done(function(data) {
              console.warn("PROMISE DONE: ", data);
              this.setState({
                loading: false,
                fail: false,
                url: data,
                errorMessage: null,
              });
          }.bind(this));
                
          promise.fail(function(xhr) {
            
            console.warn('xhr: ', xhr)
            try {
              const message = JSON.parse(xhr.responseText).message;
              this.setState({
                url: FAIL_IMAGE,
                loading: false,
                fail: true,
                errorMessage: message,
              });
            }
            catch(err) {
              this.setState({
                url: FAIL_IMAGE,
                loading: false,
                fail: true
                });
            }
          }.bind(this));
        
      }

    render () {
        return (
            <img className='map' src={this.state.url}></img>
        )
    }
}

