;(function() {

  // Init Function
  function init() {
    console.log('init mod svg.connections.js')
  }
  init()

  // Computes the real center (even if translated)
  function getCenter(elem) {
    var ctm = elem.node.getCTM()
    return [elem.cx() + ctm.e, elem.cy() + ctm.f]
  }

  // Object used to describe the real SVG connector
  function Connector(parent) {
    this.parent = parent
    this.path = this.parent.line(0, 0, 0, 0).stroke('#000')
    this.parentFrom = null
    this.parentTo = null
    this.coords = [[0, 0], [0, 0]]
    this.connectionComplete = false
  }

  // To set which node the connection is coming from
  Connector.prototype.setFrom = function(parentFrom) {
    this.parentFrom = parentFrom
    this.coords[0] = getCenter(this.parentFrom)
  }

  // To set which node the connection is going to
  Connector.prototype.setTo = function(parentTo) {
    if (parentTo instanceof Array) {
      // It has been passed a coordinates array
      this.coords[1] = parentTo

    }else if (parentTo != this.parentFrom) {
      // It has been passed the second parent node
      this.parentTo = parentTo
      this.connectionComplete = true
      this.coords[1] = getCenter(this.parentTo)
    }
  }

  Connector.prototype.complete = function() {
    if (this.connectionComplete) {
      this.parentFrom.connections.push(this)
      this.parentTo.connections.push(this)
    } else {
      this.path.remove()
    }
  }

  // Requests a redraw based on the parents' position
  Connector.prototype.update = function() {
    if (this.connectionComplete) {
      this.coords[0] = getCenter(this.parentFrom)
      this.coords[1] = getCenter(this.parentTo)
    }

    this.path.plot(this.coords) 
  }



  function ConnectionHandler(elem) {
    elem.remember('_connectable', this)
    this.elem = elem
    this.elem.connections = []
    this.rootSvg = this.elem.parent(SVG.Doc)
  }

  // Sets or updates the given options and listens for events
  ConnectionHandler.prototype.init = function(options) { 
    var that = this
    
    this.elem.on('mousedown.connects', function(e){ that.startDrag(e) })
    this.elem.on('mouseup.connects', function(e){ that.drop(e) })
  }

  // Stops listening events
  ConnectionHandler.prototype.terminate = function() {
    this.elem.off('mousedown.connects')
    this.elem.off('mouseup.connects')
  }

  // Starts tracking the element's dragging
  ConnectionHandler.prototype.startDrag = function(e) {
    var that = this

    // check for left button
    if(e.type == 'click'|| e.type == 'mousedown' || e.type == 'mousemove') {
      if((e.which || e.buttons) != 1) {
          return
      }
    }

    this.elem.fire('dragstart', { event: e, handler: this })

    // objects to handle the new connection
    this.rootSvg.newArc = new Connector(this.rootSvg)
    this.rootSvg.newArc.setFrom(this.elem)

    // bind to the whole SVG events
    SVG.on(window, 'mousemove.connects', function(e){ that.drag(e) })
    SVG.on(window, 'mouseup.connects', function(e){ that.stopDrag(e) })

    // prevent the browser and other parents to handle the event
    e.preventDefault()
    e.stopPropagation();
  }

  // Updates the path according to mouse position
  ConnectionHandler.prototype.drag = function(e){
      this.rootSvg.newArc.setTo( [e.clientX, e.clientY] )
      this.rootSvg.newArc.update()
  }

  // Dragging has ended: let's do the cleanup
  ConnectionHandler.prototype.stopDrag = function(e){
    this.elem.fire('dragstop', { event: e, handler: this })

    this.rootSvg.newArc.complete()
    delete this.rootSvg.newArc

    // unbind events
    SVG.off(window, 'mousemove.connects')
    SVG.off(window, 'mouseup.connects')
  }

  // Starts tracking the element's dragging
  ConnectionHandler.prototype.drop = function(e) {
    this.elem.fire('dropped', { event: e, handler: this })

    this.rootSvg.newArc.setTo(this.elem)
    this.rootSvg.newArc.update()

  }


  SVG.Connection = SVG.invent({
    // the SVG element will be a path
    create: 'path'

    // inherits Path's class methods
    , inherit: SVG.Path

    // add methods to the newly added shape
    , extend: {
      // private method: register the connection at the parents
      connectTo: function(p1, p2) {
        if (p1.connections.indexOf(this) == -1)
          p1.connections.push(this)
          
        if (p2.connections.indexOf(this) == -1)
          p2.connections.push(this)
          
        return this
      }
        
      // public method: computes and updates the line according to parents' positions
      , refresh: function(p1, p2) {
          var cp1 = getCenter(p1)
            , cp2 = getCenter(p2)
            , lineString = ''
            , controlPointDistance = cp1[0] > cp2[0] ? -150 : 150

          
          lineString += 'M' + cp1[0] + ',' + cp1[1] // starting point
          lineString += 'C' + ( cp1[0] + controlPointDistance ) + ',' + cp1[1] // starting control point
          lineString += ' ' + ( cp2[0] - controlPointDistance ) + ',' + cp2[1] // ending control point
          lineString += ' ' + cp2[0] + ',' + cp2[1] // ending point
          
          this.plot(lineString).stroke("#000").fill('transparent')

          return this
      }
    }

    // Add the constructor of the new element to the parent
    , construct: {
      connection: function(p1, p2) {
        return this.put(new SVG.Connection).connectTo(p1, p2).refresh(p1, p2)
      }

    }
  })

  

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
    },

    // Redraw all the connections for the current node
    updateConnections: function() {
        // The node _must_ be already initialized
        var connectionHandler = this.remember('_connectable')

        this.connections.forEach(function(conn) {
          conn.update()
        })

        return this
    }

  })

}).call(this);
