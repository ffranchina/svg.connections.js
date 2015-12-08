;(function() {

  function ConnectionHandler(elem) {
    elem.remember('_connectable', this)
    this.elem = elem
  }

  // Sets or updates the given options and listens for events
  ConnectionHandler.prototype.init = function(options) { 
    var _this = this
    
    this.elem.on('mousedown.connects', function(e){ _this.startDrag(e) })

    this.elem.on('mouseup.connects', function(e){ _this.drop(e) })
  }

  // Stops listening events
  ConnectionHandler.prototype.terminate = function() {
    this.elem.off('mousedown.connects')

    this.elem.off('mouseup.connects')
  }

  // Starts tracking the element's dragging
  ConnectionHandler.prototype.startDrag = function() {
    console.log(this.elem.node.id + ': Hey! You\'re dragging me! :)')
  }

  // Starts tracking the element's dragging
  ConnectionHandler.prototype.drop = function() {
    console.log(this.elem.node.id + ': You dropped me.. :(')
  }


  SVG.extend(SVG.Element, {
    // Make element connectable
    connectable: function(value, options) {

      var connectionHandler

      // Check the parameters and reassign if needed
      if (typeof value == 'object') {
        options = value
        value = true
      }

      value = typeof value === 'undefined' ? true : value

      // TODO options to be defined
      options = typeof options === 'undefined' ? true : {
        // specifiy if the connection is starting or ending with this element
        'direction' : 'both', // ammitted values: 'both', 'in', 'out'

        // custom class to append to the connection elements
        'class' : 'connection' // ammitted values: any valid class string
      }

      connectionHandler = this.remember('_connectable') || new ConnectionHandler(this)

      if (value)
        connectionHandler.init(options)
      else
        connectionHandler.terminate()

      return this
    }

  })

}).call(this);
