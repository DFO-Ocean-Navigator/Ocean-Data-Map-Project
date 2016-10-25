import React from 'react';

class SelectBox extends React.Component {
    handleChange(e) {
        this.props.onUpdate(this.props.id, e.target.checked);
    }
    render() {
        return (
            <div className='SelectBox input'>
                <div>
                    <label className='forcheckbox'>
                        <input type='checkbox' id={this.props.id} onChange={this.handleChange.bind(this)} checked={this.props.state} />
                        {this.props.title}
                    </label>
                </div>
            </div>
        );
    }
}

export default SelectBox;

