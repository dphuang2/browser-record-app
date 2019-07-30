import './Player.css';
import { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Replayer } from 'rrweb';
import 'rrweb/dist/rrweb.min.css';

const Player = ({ replay, handleOutsideClick }) => {
  const containerRef = useRef();
  const playerRef = useRef();
  const [playerScale, setPlayerScale] = useState(1);

  const handleClick = (event) => {
    if (containerRef.current.contains(event.target)) {
      return;
    }
    handleOutsideClick();
  };


  useEffect(() => {
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    const replayer = new Replayer(replay.events, {
      root: playerRef.current,
    });
    replayer.on('resize', () => { console.log('test'); });
    replayer.play();

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);


  return (
    <div className="player-container">
      <div ref={containerRef} className="player-wrapper">
        <div ref={playerRef} id="player" />
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
