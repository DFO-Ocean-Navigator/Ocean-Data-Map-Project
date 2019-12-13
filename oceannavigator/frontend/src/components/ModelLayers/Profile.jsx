import React from 'react';

export default class  extends React.Component {

    constructor (props) {
        super (props);

        this.state = {
            
        }

        this.loadImage = this.loadImage.bind(this);
    }


    componentDidMount () {
        if (this.props.points !== undefined) {
            this.props.points

            let query = {
                points: [[51.35531765447794, -49.211058497428894], [51.39920197206365, -47.52356278896332], [50.24439496210104, -47.4532459974289], [50.0641879487261, -49.49230420589448], [51.35531765447794, -49.211058497428894]]
            }

            this.loadImage(query);
        }
    }

    loadImage(query) {

        const paramString = $.param({
          query: stringify(query),
          format: "json",
        });
    
        if (this.state.paramString !== paramString) {
    
          this.setState({
            loading: true, 
            fail: false, 
            //url: LOADING_IMAGE,
            paramString: paramString,
            errorMessage: null,
          });
          let url
          if (this.props.query.type === 'class4' || this.props.query.type === 'drifter') {
            url = '/plot/'
          } else {
            url = '/api/v1.0/plot/'
          }
          const promise = $.ajax({
            url: url,
            cache: true,
            data: paramString,
            dataType: "json",
            method: (paramString.length < 1536) ? "GET" : "POST",
          }).promise();
    
          promise.done(function(data) {
            if (this._mounted) {
              this.setState({
                loading: false,
                fail: false,
                url: data,
                errorMessage: null,
              });
            }
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
      }

    render () {
        return (
            <img src={this.state.url}></img>
        )
    }
}

