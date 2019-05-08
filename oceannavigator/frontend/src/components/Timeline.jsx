import React from "react";
import PropTypes from "prop-types";
import moment from "moment-timezone";

export default class Timeline extends React.Component {

  constructor(props) {
    super(props);
        
    const day_map = {
      0: "Sun",
      1: "Mon",
      2: "Tue",
      3: "Wed",
      4: "Thu",
      5: "Fri",
      6: "Sat",
    };

    const inc = this.props.time_inc.split("-");

    this.state = {
      day_fromnum: day_map,
      inc,
      step: inc[0],
      quantum: inc[1]
    };

    this.daysBetween = this.daysBetween.bind(this);
    this.hoursBetween = this.hoursBetween.bind(this);
  }

  /*

    */
  componentDidMount() {
    if (this.props.time_inc != undefined) {
      const inc = this.props.time_inc.split("-");
      this.setState({
        inc,
        step: inc[0],
        quantum: inc[1]
      });
    }
        
  }

  /*

    */
  componentDidUpdate(prevProps, prevState) {
    if (prevProps.time_inc != this.props.time_inc) {
      const inc = this.props.time_inc.split("-");
      this.setState({
        inc,
        step: inc[0],
        quantum: inc[1]
      });
    }
  }

  /*

    */
  hoursBetween( date1, date2 ) {
    //Get 1 hour in milliseconds
    const one_day=1000*60*60;
        
    // Convert both dates to milliseconds
    const date1_ms = date1.valueOf();
    const date2_ms = date2.valueOf();
        
    // Calculate the difference in milliseconds
    const difference_ms = date2_ms - date1_ms;

    // Convert back to days and return
    return Math.round(difference_ms/one_day); 
  }

  /*

    */
  daysBetween( date1, date2 ) {
    //Get 1 day in milliseconds
    const one_day=1000*60*60*24;
        
    // Convert both dates to milliseconds
    const date1_ms = date1.valueOf();
    const date2_ms = date2.valueOf();
        
    // Calculate the difference in milliseconds
    const difference_ms = date2_ms - date1_ms;

    // Convert back to days and return
    return Math.round(difference_ms/one_day); 
  }

  render() {
    const markers = [];
    let offset = 0;
    // Calculate the number of pixels between each day marker
    const num_days = this.daysBetween(this.props.startTime, this.props.endTime);
    let offset_val = ((this.props.length) / (num_days + 1));
    //let offset_val = 658 * 0.85/10;
    const marker_date = moment(this.props.startTime.valueOf());
    marker_date.tz("GMT");

    //marker_date.setDate(marker_date.getUTCDate() + 1)
    for (let i = 1; i <= num_days; i += 1) {
      offset = (offset_val * i) - (2 * i);
      const label_offset = {left: offset + 3};
      offset = {left: offset};
          
      markers.push(
        <div className='marker_container' key={i}>
          <div className='time_marker' style={offset}></div>
          <div className='marker_value' style={label_offset}>{marker_date.format("DD")}</div>
          <div className='marker_day' style={label_offset}>{marker_date.format("ddd")}</div>
        </div>
      );
        
      marker_date.add(1, "days");
    }

    let currentTime = "";
    if (this.state.quantum === "hour") {
      currentTime = this.props.currentTime.format("YYYY/MM/DD[ : ]HH[z]");
    } else {
      currentTime = this.props.currentTime.format("YYYY/MM/DD");
    }
        
    let hours_between = this.hoursBetween(this.props.startTime, this.props.endTime);
        
    offset_val = ((this.props.length) / (hours_between + 1));
    const time = moment(this.props.startTime);
    time.set({
      hour: 0
    });
    time.tz("GMT");

        
    hours_between = this.hoursBetween(this.props.currentTime, time);
    const current_offset = (hours_between * offset_val) - (hours_between * 0.25);
    const current_style = { left: -current_offset + 7 };

    const timeline_container = {width: this.props.length};

    return(
      <div className='timeline_container' style={timeline_container}>
        <div className='time_current' style={current_style}>
        </div>
        <div className='time_bar'>
          {markers}
        </div>
      </div>
    );
  }

}

Timeline.propTypes = {
  updateParent: PropTypes.func,
  startTime: PropTypes.object,
  endTime: PropTypes.object,
  quantum: PropTypes.string,
};