import React, { Component } from 'react';

import styles from './stream.css';

export default class Stream extends Component {
  render() {
    return (
      <iframe 
        className={styles.stream}
        src={`http://player.twitch.tv/?channel=${this.props.stream}`}
        frameBorder={0}
        allowFullScreen={true}
      />
    );
  }
}