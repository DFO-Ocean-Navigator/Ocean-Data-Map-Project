




export default class PlotDecorator extends React.Component {

    constructor (props) {


        this.state = {
            options = {}
        }

        this.plot = this.plot.bind(this);
        this.disabled = this.disabled.bind(this);
        this.getOptions = this.getOptions.bind(this);
        this.updateOptions = this.updateOptions.bind(this);

    }

    /*
        Function Which Plots something given some data
    
        Layers is the value_ component of the all the displayed layers in ol 
    */
    plot ( layers ) {
        
        // Uses this.state.options
        plotOptions = this.state.options;


        return;
    }


    /*
        Will determine whether this specfic plot can be made using the given layers
    
        return a boolean value, true meaning that this plot can be made
    */
    disabled ( layers, shape ) {
        return false;
    }


    /*
        Returns a component which contains all the options and selection for this component
    
        Any options changes should be reflected in this.state.options
    */
    getOptions() {
        options = <div></div>;
        
        return options;
    }


    /*
        ~~~ INTERNAL FUNCTION ~~~
    
        Updates the plot options, this should be passed used to update changes made in the returned getOptions component
    */
    updateOptions() {
        return;
    }

    render() {
        <div>

        </div>
    }

}