import React from 'react';

const stringify = require("fast-stable-stringify");

export default class Model_3D extends React.Component {
    constructor (props) {
        super(props)

        this.state = {
            next_query: {
                "area": this.props.area,
                "datasets": {},
                "interp": this.props.interp,
                "neighbours": this.props.neighbours,
                "projection": this.props.projection,
                "radius": this.props.radius,
                "time": this.props.time,
            }
        }
    
        this.urlFromStateQuery = this.urlFromStateQuery.bind(this);
    }

    componentDidMount() {
        this.loadNextPlot();
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

        // Create all the components individually that need to be added to panels
        
        const select_dataset = (
            <ComboBox
              key='dataset'
              id='dataset'
              state={this.props.dataset}
              def=''
              url='/api/v1.0/datasets/'
              title={_("Dataset")}
              onUpdate={this.props.onUpdate}
            />
        )

        const select_variable = (
            <ComboBox
              id='variable'
              key='variable'
              multiple={true}
              state={this.state.output_variables}
              def={"defaults.dataset"}
              onUpdate={(keys, values) => { this.setState({ output_variables: values[0], }); }}
              url={"/api/v1.0/variables/?vectors&dataset=" + this.state.dataset_0.dataset
              }
              title={_("Variables")}
            />
        )
        

        // Create Arrays holding all the components for each panel
        let data_selection = [select_dataset, select_variable];

        // Create the panels if their associated arrays are not of length 0
        // ADD LATER

        // Load Plot to render

        let plot = <iframe src={this.state.url} frameBorder="0" style={{width: '100%', height:'100%'}}></iframe>

        return (
            <Row>
              <Col lg={2}>
                {data_selection}
              </Col>
              <Col lg={8}>
                <div style={{height: '100%'}}>
                    {plot}
                </div>
              </Col>
            </Row>
            
        )
    }
}