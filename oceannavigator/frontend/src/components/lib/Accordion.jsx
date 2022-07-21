import React from "react";
import PropTypes from "prop-types";

import { withTranslation } from "react-i18next";

export class Accordion extends React.Component { 
  constructor(props) {
    super(props);

    this.state = {
      isActive: false
    }
  };

  render() {
    return (
      <div className="accordion-item">
        <div className="accordion-title" onClick={() => this.setState(prevState => ({isActive: !prevState.isActive}))}>
          <div>{this.props.title}</div>
          <div>{this.state.isActive ? '˄' : '˅'}</div>
        </div>
        {this.state.isActive && <div className="accordion-content">{this.props.content}</div>}
        {/* {this.state.isActive && <div className="accordion-content"><h1>Test</h1></div>} */}
      </div>
    );    
  }
};

//***********************************************************************
// Accordion.propTypes = {
// id: PropTypes.string.isRequired,
// };

// Accordion.defaultProps = {

// };

export default withTranslation()(Accordion);


// const [isActive, setIsActive] = useState(false);

// return (
//   <div className="accordion-item">
//     <div className="accordion-title" onClick={() => setIsActive(!isActive)}>
//       <div>{title}</div>
//       <div>{isActive ? '-' : '+'}</div>
//     </div>
//     {isActive && <div className="accordion-content">{content}</div>}
//   </div>
// );