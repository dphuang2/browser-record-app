import './Modal.css';
import PropTypes from 'prop-types';

const Modal = ({ handleClose, show, children }) => {
  const showHideClassname = show ? 'modal display-block' : 'modal display-none';

  return (
    <div className={showHideClassname}>
      <section className="modal-main">
        {children}
        <button type="button" onClick={handleClose}>close</button>
      </section>
    </div>
  );
};


Modal.propTypes = {
  handleClose: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
};

Modal.defaultProps = function getDefaultProps() {
  return {
    children: [],
  };
};


export default Modal;
