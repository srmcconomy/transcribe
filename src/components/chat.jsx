import React, { Component } from 'react';

import styles from './chat.css';

export default class Chat extends Component {
  render() {
    return (
      <iframe
        className={styles.chat}
        frameBorder={0}
        scrolling="no"
        src={`http://twitch.tv/${this.props.stream}/chat`}
      />
    );
  }
}