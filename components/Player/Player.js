import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';
import 'rrweb/dist/rrweb.min.css';
import './Player.css';

const Player = ({ replay, handleOutsideClick }) => {
  const wrapperRef = useRef();
  const playerRef = useRef();
  const [scale, setScale] = useState();
  const [availableWidth, setAvailableWidth] = useState();
  const [availableHeight, setAvailableHeight] = useState();
  const [contentWidth, setContentWidth] = useState();
  const [contentHeight, setContentHeight] = useState();
  const id = 'player-display';

  const setAvailableDimensions = () => {
    if (!wrapperRef || !wrapperRef.current) return;
    const { width, height } = wrapperRef.current.getBoundingClientRect();
    setAvailableWidth(width);
    setAvailableHeight(height);
  };

  const handleClick = (event) => {
    if (wrapperRef
      && wrapperRef.current
      && wrapperRef.current.contains(event.target)) {
      return;
    }
    handleOutsideClick();
  };

  useEffect(() => {
    const replayer = new Replayer(replay.events, {
      root: playerRef.current,
    });
    replayer.play();
    replayer.on('start', () => { console.log('test'); });
    replayer.on('resize', (event) => {
      setContentWidth(event.width);
      setContentHeight(event.height);
      setAvailableDimensions();
    });
    window.addEventListener('resize', setAvailableDimensions);
    document.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('resize', setAvailableDimensions);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  useEffect(() => {
    // Account for browser precision for transform CSS property
    setScale(Math.min(
      (availableWidth - 8) / contentWidth,
      (availableHeight - 8) / contentHeight,
    ));
  }, [availableWidth, availableHeight, contentWidth, contentHeight]);

  return (
    <div className="player-container">
      <div ref={wrapperRef} className="player-wrapper">
        <div
          id={id}
          style={{
            transform: `translate(-${50 * scale}%, -${50 * scale}%) scale(${scale})`,
          }}
          ref={playerRef}
        />
      </div>
    </div>
  );
};

Player.propTypes = {
  handleOutsideClick: PropTypes.func.isRequired,
  replay: PropTypes.shape({
    events: PropTypes.arrayOf(PropTypes.object).isRequired,
  }).isRequired,
};

export default Player;
