import {
  useRef, useEffect, useState,
} from 'react';

import PropTypes from 'prop-types';
import Controller from './Controller';
import Displayer from './Displayer';
import 'rrweb/dist/rrweb.min.css';

const Player = ({ replay, handleOutsideClick }) => {
  const displayerRef = useRef();
  const controllerRef = useRef();
  const [percentageWatched, setPercentageWatched] = useState(0);

  const handleClick = (event) => {
    if (
      (displayerRef
      && displayerRef.current
      && displayerRef.current.contains(event.target))
      || (controllerRef
        && controllerRef.current
        && controllerRef.current.contains(event.target))
    ) return;
    handleOutsideClick();
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  return (
    <div className="player-container">
      <Displayer
        percentageWatched={percentageWatched}
        setPercentageWatched={setPercentageWatched}
        displayerRef={displayerRef}
        replay={replay}
      />
      <Controller
        setPercentageWatched={setPercentageWatched}
        controllerRef={controllerRef}
      />
      <style jsx>
        {`
        .player-container {
    position: fixed;
    top: 0;
    left: 0;
    width:100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 999999;
    display: block;
  }
    `}
      </style>
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
