;(function() {


  // Computes the real center (even if translated)
  function getCenter(elem) {
    var ctm = elem.node.getCTM()
    return [elem.cx() + ctm.e, elem.cy() + ctm.f]
  }


  // Object used to describe the temporary connector
  function TmpConnector(rootDraw, startingElem) {
    this.path = rootDraw.line(0, 0, 0, 0).stroke('#000')
    this.startingElem = startingElem
    this.coords = [[0, 0], [0, 0]]

    this.setFrom( getCenter( this.startingElem ) )
  }

  // Returns the element from which the connection has started
  TmpConnector.prototype.getStartingElem = function() {
    return this.startingElem
  }

  // To set the coordinates the connection is coming from
  TmpConnector.prototype.setFrom = function(coordsFrom) {
    this.coords[0] = coordsFrom
  }

  // To set the coordinates the connection is going to
  TmpConnector.prototype.setTo = function(coordsTo) {
    this.coords[1] = coordsTo
  }

  // The temporary connector's job is over
  TmpConnector.prototype.cancel = function() {
    this.path.remove()
  }

  // Redraw the temporay connector
  TmpConnector.prototype.refresh = function() {
    this.path.plot(this.coords) 
  }


  function ConnectionHandler(elem) {
    elem.remember('_connectable', this)
    this.elem = elem
    this.elem.connections = []
    this.rootDraw = this.elem.doc()
  }

  // Sets or updates the given options and listens for events
  ConnectionHandler.prototype.init = function(options) { 
    var that = this
    
    this.elem.on('mousedown.connects', function(e){ that.startDrag(e) })
    this.elem.on('mouseup.connects', function(e){ that.drop(e) })
  }

  // Stops listening events - no more connectable
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

    this.elem.fire('connectiondragstart', { event: e, handler: this })

    // set up of the temporary connector
    this.rootDraw.tmpConnection = new TmpConnector(this.rootDraw, this.elem)
    
    // bind to the whole SVG events
    SVG.on(window, 'mousemove.connects', function(e){ that.drag(e) })
    SVG.on(window, 'mouseup.connects', function(e){ that.stopDrag(e) })
    
    // prevent the browser and other parents to handle the event
    e.preventDefault()
    e.stopPropagation();
  }

  // Updates the path according to mouse position
  ConnectionHandler.prototype.drag = function(e){
    this.elem.fire('connectiondrag', { event: e, handler: this })

    // refresh the temporary connector
    this.rootDraw.tmpConnection.setTo( [e.clientX, e.clientY] )
    this.rootDraw.tmpConnection.refresh()
  }

  // Dragging has ended: let's do the cleanup
  ConnectionHandler.prototype.stopDrag = function(e){
    this.elem.fire('connectiondragstop', { event: e, handler: this })

    // clean up the temporary connector
    this.rootDraw.tmpConnection.cancel()
    delete this.rootDraw.tmpConnection

    // unbind events
    SVG.off(window, 'mousemove.connects')
    SVG.off(window, 'mouseup.connects')
  }

  // Starts tracking the element's dragging
  ConnectionHandler.prototype.drop = function(e) {
    this.elem.fire('connectiondrop', { event: e, handler: this })

    this.rootDraw.fire('newconnection', {
      event: e
      , handler: this
      , parentFrom: this.rootDraw.tmpConnection.getStartingElem()
      , parentTo: this.elem
    })
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
        this.p1 = p1
        this.p2 = p2
        
        if (this.p1.connections.indexOf(this) == -1)
          this.p1.connections.push(this)
          
        if (this.p2.connections.indexOf(this) == -1)
          this.p2.connections.push(this)
          
        return this
      }
        
      // public method: computes and updates the line according to parents' positions
      , refresh: function() {
        var cp1 = getCenter( this.p1 )
        , cp2 = getCenter( this.p2 )
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
        return this.put(new SVG.Connection).connectTo(p1, p2).refresh()
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

      // TODO: options to be defined
      options = typeof options === 'undefined' ? true : {
        // specifiy if the connection is starting or ending with this element
        'direction' : 'both' // ammitted values: 'both', 'in', 'out'
      }

      connectionHandler = this.remember('_connectable') || new ConnectionHandler(this)

      if (value)
        connectionHandler.init(options)
      else
        connectionHandler.terminate()

      return this
    }

    // Redraw all the connections for the current node
    , refreshConnections: function() {
      // The node _must_ be already initialized
      var connectionHandler = this.remember('_connectable')

      this.connections.forEach(function(conn) {
        conn.refresh()
      })

      return this
    }

  })

}).call(this);
