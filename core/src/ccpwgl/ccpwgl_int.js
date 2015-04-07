/**
 * Slightly Modified Version of CCP's ccpwgl_int.js file
 *
 * Lines 1310 -> 1320 & 1364 -> 1373 : Added functionality so we can get all the SOF data
 *
 */


!function (exports, global) {
    function Tw2Frustum() {
        this.planes = [quat4.create(), quat4.create(), quat4.create(), quat4.create(), quat4.create(), quat4.create()], this.viewPos = vec3.create(), this.viewDir = vec3.create(), this.halfWidthProjection = 1, this._tempVec = vec3.create()
    }

    function Tw2RawData() {
        this.nextOffset = 0, this.data = null, this.elements = {}
    }

    function Tw2BinaryReader(data) {
        this.data = data, this.cursor = 0
    }

    function Tw2VertexElement(usage, usageIndex, type, elements, offset) {
        this.usage = usage, this.usageIndex = usageIndex, this.type = type, this.elements = elements, this.offset = "undefined" == typeof offset ? 0 : offset, this.location = null, this.customSetter = null
    }

    function Tw2VertexDeclaration() {
        this.elements = [], this._elementsSorted = []
    }

    function CompareDeclarationElements(a, b) {
        return a.usage < b.usage ? -1 : a.usage > b.usage ? 1 : a.usageIndex < b.usageIndex ? -1 : a.usageIndex > b.usageIndex ? 1 : 0
    }

    function Tw2ObjectReader(xmlNode) {
        this.xmlNode = xmlNode
    }

    function Tw2Resource() {
        this.path = "", this._isLoading = !1, this._isGood = !1, this._isPurged = !1, this._notifications = [], this.activeFrame = 0, this.doNotPurge = 0
    }

    function Inherit(derived, base) {
        for (var i in base.prototype) i in derived.prototype || (derived.prototype[i] = base.prototype[i]);
        derived.prototype._super = base.prototype
    }

    function Tw2VariableStore() {
        this._variables = {}
    }

    function Tw2MotherLode() {
        this._loadedObjects = {}, this.Find = function (path) {
            return path in this._loadedObjects ? this._loadedObjects[path] : null
        }, this.Add = function (path, obj) {
            this._loadedObjects[path] = obj
        }, this.Remove = function (path) {
            delete this._loadedObjects[path]
        }, this.Clear = function () {
            this._loadedObjects = {}
        }, this.PurgeInactive = function (curFrame, frameLimit, frameDistance) {
            for (var path in this._loadedObjects) {
                var obj = this._loadedObjects[path];
                obj.doNotPurge || (obj._isPurged && (console.log("Removed purged resource ", obj.path), delete this._loadedObjects[path]), obj._isGood && (curFrame - obj.activeFrame) % frameLimit >= frameDistance && obj.Unload() && (console.info("Unloaded unused resource ", obj.path), delete this._loadedObjects[path]))
            }
        }
    }

    function Tw2LoadingObject() {
        this._super.constructor.call(this), this.object = null, this._redContents = null, this._inPrepare = null, this._objects = []
    }

    function Tw2ResMan() {
        function _NormalizePath(path) {
            return "str:/" == path.substr(0, 5) ? path : (path = path.toLowerCase(), path.replace("\\", "/"), path)
        }

        function _GetPathExt(path) {
            if ("str:/" == path.substr(0, 5)) {
                var slash = path.indexOf("/", 5);
                return -1 == slash ? null : path.substr(5, slash - 5)
            }
            var dot = path.lastIndexOf(".");
            return -1 == dot ? null : path.substr(dot + 1)
        }

        function _DoLoadResource(obj) {
            return function () {
                readyState = 0;
                try {
                    readyState = this.readyState
                } catch (e) {
                    return console.error("ResMan:", ' communication error when loading  "', obj.path, '" (readyState ', readyState, ")"), obj.LoadFinished(!1), void resMan._pendingLoads--
                }
                if (4 === readyState) {
                    if (200 === this.status) {
                        obj.LoadFinished(!0);
                        var data = null,
                            xml = null;
                        try {
                            data = this.responseText, xml = this.responseXML
                        } catch (e) {
                            data = this.response
                        }
                        resMan._prepareQueue.push([obj, data, xml])
                    } else console.error("ResMan:", ' communication error when loading  "', obj.path, '" (code ', this.status, ")"), obj.LoadFinished(!1);
                    resMan._pendingLoads--
                }
            }
        }

        this.resourcePaths = {}, this.resourcePaths.res = "http://developers.eveonline.com/ccpwgl/assetpath/860161/", this._extensions = {}, this.motherLode = new Tw2MotherLode, this.maxPrepareTime = .05, this.prepareBudget = 0, this._prepareQueue = [], this.autoPurgeResources = !0, this.activeFrame = 0, this._purgeTime = 0, this._purgeFrame = 0, this._purgeFrameLimit = 1e3, this.purgeTime = 30, this._pendingLoads = 0, this._noLoadFrames = 0, this.IsLoading = function () {
            return this._noLoadFrames < 2
        }, this.RegisterExtension = function (extension, constructor) {
            this._extensions[extension] = constructor
        }, this._CreateHttpRequest = function () {
            var httpRequest = null;
            if (window.XMLHttpRequest) httpRequest = new XMLHttpRequest;
            else if (window.ActiveXObject) try {
                httpRequest = new ActiveXObject("Msxml2.XMLHTTP")
            } catch (e) {
                try {
                    httpRequest = new ActiveXObject("Microsoft.XMLHTTP")
                } catch (e) {
                }
            }
            return httpRequest || console.error("ResMan:", " could not create an XMLHTTP instance"), httpRequest
        }, this.LogPathString = function (path) {
            return "str:/" == path.substr(0, 5) && path.length > 64 ? path.substr(0, 64) + "..." : path
        }, this.PrepareLoop = function (dt) {
            0 == this._prepareQueue.length && 0 == this._pendingLoads ? this._noLoadFrames < 2 && this._noLoadFrames++ : this._noLoadFrames = 0, resMan.prepareBudget = resMan.maxPrepareTime;

            for (var now = new Date, startTime = now.getTime(), preparedCount = 0; resMan._prepareQueue.length;) {
                try {
                    var result = resMan._prepareQueue[0][0].Prepare(resMan._prepareQueue[0][1], resMan._prepareQueue[0][2])
                } catch (e) {
                    throw resMan._prepareQueue.shift(), e
                }
                if (result || (now = new Date, console.info("Prepared ", resMan._prepareQueue[0][0].path, " in ", .001 * (now.getTime() - startTime), " secs"), resMan._prepareQueue.shift(), preparedCount++), now = new Date, resMan.prepareBudget -= .001 * (now.getTime() - startTime), resMan.prepareBudget < 0) break
            }
            return this._purgeTime += dt, this._purgeTime > 1 && (this.activeFrame += 1, this._purgeTime -= Math.floor(this._purgeTime), this._purgeFrame += 1, this._purgeFrame >= 5 && this.autoPurgeResources && this.motherLode.PurgeInactive(this._purgeFrame, this._purgeFrameLimit, this.purgeTime)), !0
        }, this.BuildUrl = function (resPath) {
            var prefixIndex = resPath.indexOf(":/");
            if (-1 == prefixIndex) return console.error("ResMan:", ' invalid resource path: "', resPath, '"'), resPath;
            var prefix = resPath.substr(0, prefixIndex);
            return prefix in this.resourcePaths ? this.resourcePaths[prefix] + resPath.substr(prefixIndex + 2) : (console.error("ResMan:", ' invalid resource path: "', resPath, '"'), resPath)
        }, this._LoadResource = function (obj) {
            obj._isPurged = !1;
            var path = obj.path;
            if (this.motherLode.Add(path, obj), "DoCustomLoad" in obj && obj.DoCustomLoad(path)) return obj;
            var httpRequest = this._CreateHttpRequest();
            httpRequest.onreadystatechange = _DoLoadResource(obj), console.info('Requesting "', this.BuildUrl(path), '"'), httpRequest.open("GET", this.BuildUrl(path)), obj.requestResponseType && (httpRequest.responseType = obj.requestResponseType), obj.LoadStarted();
            try {
                httpRequest.send(), this._pendingLoads++
            } catch (e) {
                console.error("ResMan:", " error sending resource HTTP request: ", e.toString())
            }
        }, this.ReloadResource = function (resource) {
            var path = resource.path;
            console.info("ResMan:", "reloading resource ", path);
            var obj = this.motherLode.Find(path);
            return null === obj || obj.IsPurged() ? (this._LoadResource(resource), resource) : obj
        }, this.GetResource = function (path) {
            path = _NormalizePath(path);
            var obj = this.motherLode.Find(path);
            if (null !== obj) return obj.IsPurged() && obj.Reload(), obj;
            var ext = _GetPathExt(path);
            if (null == ext) return console.error("ResMan:", " unknown extension for path ", this.LogPathString(path)), null;
            if (!(ext in this._extensions)) return console.error("ResMan:", " unregistered extension  ", ext), null;
            var obj = new this._extensions[ext];
            return obj.path = path, this._LoadResource(obj), obj
        }, this.GetObject = function (path, callback) {
            this._GetObject(path, callback, !0)
        }, this.GetObjectNoInitialize = function (path, callback) {
            this._GetObject(path, callback, !1)
        }, this._GetObject = function (path, callback, initialize) {
            path = _NormalizePath(path);
            var obj = null;
            obj = {};
            var res = this.motherLode.Find(path);
            if (null !== res) return void res.AddObject(obj, callback, initialize);
            res = new Tw2LoadingObject, res.path = path, res.AddObject(obj, callback, initialize), this.motherLode.Add(path, res);
            var httpRequest = this._CreateHttpRequest();
            httpRequest.onreadystatechange = _DoLoadResource(res), console.info('Requesting "', this.BuildUrl(path), '"'), httpRequest.open("GET", this.BuildUrl(path)), res.LoadStarted(), obj._objectLoaded = !1;
            try {
                httpRequest.send(), this._pendingLoads++
            } catch (e) {
                console.error("ResMan:", " error sending object HTTP request: ", e.toString())
            }
        }, this.Clear = function () {
            this.motherLode.Clear()
        }
    }

    function Tw2PerObjectData() {
    }

    function Tw2SamplerState() {
        this.registerIndex = 0, this.name = "", this.minFilter = device.gl.LINEAR, this.maxFilter = device.gl.LINEAR, this.minFilterNoMips = device.gl.LINEAR, this.addressU = device.gl.REPEAT, this.addressV = device.gl.REPEAT, this.addressW = device.gl.REPEAT, this.anisotropy = 1, this.samplerType = device.gl.TEXTURE_2D, this.isVolume = !1, this.hash = 0
    }

    function Tw2FloatParameter(name, value) {
        this.name = "undefined" != typeof name ? name : "", this.value = "undefined" != typeof value ? value : 1, this.constantBuffer = null
    }

    function Tw2FloatParameter(name, value) {
        this.name = "undefined" != typeof name ? name : "", this.value = "undefined" != typeof value ? value : 1, this.constantBuffer = null
    }

    function Tw2Vector2Parameter(name, value) {
        this.name = "undefined" != typeof name ? name : "", this.value = "undefined" != typeof value ? value : new Float32Array([1, 1])
    }

    function Tw2Vector3Parameter(name, value) {
        this.name = "undefined" != typeof name ? name : "", this.value = vec3.create("undefined" != typeof value ? value : [1, 1, 1]), this.constantBuffer = null, this.offset = 0
    }

    function Tw2Vector4Parameter(name, value) {
        this.name = "undefined" != typeof name ? name : "", this.value = "undefined" != typeof value ? value : quat4.create([1, 1, 1, 1]), this.constantBuffer = null, this.offset = 0
    }

    function Tw2MatrixParameter(name, value) {
        this.name = "undefined" != typeof name ? name : "", "undefined" != typeof value ? this.value = value : (this.value = mat4.create(), mat4.identity(this.value)), this.constantBuffer = null, this.offset = 0
    }

    function Tw2VariableParameter(name, variableName) {
        this.name = "undefined" != typeof name ? name : "", this.variableName = "undefined" != typeof variableName ? variableName : ""
    }

    function Tw2TextureParameter(name, texturePath) {
        this.name = "undefined" != typeof name ? name : "", this.useAllOverrides = !1, this.addressUMode = 1, this.addressVMode = 1, this.addressWMode = 1, this.filterMode = 2, this.mipFilterMode = 2, this.maxAnisotropy = 4, this.textureRes = null, this._sampler = null, "undefined" != typeof texturePath ? (this.resourcePath = texturePath, this.Initialize()) : this.resourcePath = ""
    }

    function Tw2TransformParameter(name) {
        this.name = "undefined" != typeof name ? name : "", this.scaling = vec3.create([1, 1, 1]), this.rotationCenter = vec3.create([0, 0, 0]), this.rotation = [0, 0, 0, 1], this.translation = vec3.create([0, 0, 0]), this.worldTransform = mat4.create(), mat4.identity(this.worldTransform)
    }

    function Tw2Device() {
        this.RM_ANY = -1, this.RM_OPAQUE = 0, this.RM_DECAL = 1, this.RM_TRANSPARENT = 2, this.RM_ADDITIVE = 3, this.RM_DEPTH = 4, this.RM_FULLSCREEN = 5, this.RS_ZENABLE = 7, this.RS_FILLMODE = 8, this.RS_SHADEMODE = 9, this.RS_ZWRITEENABLE = 14, this.RS_ALPHATESTENABLE = 15, this.RS_LASTPIXEL = 16, this.RS_SRCBLEND = 19, this.RS_DESTBLEND = 20, this.RS_CULLMODE = 22, this.RS_ZFUNC = 23, this.RS_ALPHAREF = 24, this.RS_ALPHAFUNC = 25, this.RS_DITHERENABLE = 26, this.RS_ALPHABLENDENABLE = 27, this.RS_FOGENABLE = 28, this.RS_SPECULARENABLE = 29, this.RS_FOGCOLOR = 34, this.RS_FOGTABLEMODE = 35, this.RS_FOGSTART = 36, this.RS_FOGEND = 37, this.RS_FOGDENSITY = 38, this.RS_RANGEFOGENABLE = 48, this.RS_STENCILENABLE = 52, this.RS_STENCILFAIL = 53, this.RS_STENCILZFAIL = 54, this.RS_STENCILPASS = 55, this.RS_STENCILFUNC = 56, this.RS_STENCILREF = 57, this.RS_STENCILMASK = 58, this.RS_STENCILWRITEMASK = 59, this.RS_TEXTUREFACTOR = 60, this.RS_WRAP0 = 128, this.RS_WRAP1 = 129, this.RS_WRAP2 = 130, this.RS_WRAP3 = 131, this.RS_WRAP4 = 132, this.RS_WRAP5 = 133, this.RS_WRAP6 = 134, this.RS_WRAP7 = 135, this.RS_CLIPPING = 136, this.RS_LIGHTING = 137, this.RS_AMBIENT = 139, this.RS_FOGVERTEXMODE = 140, this.RS_COLORVERTEX = 141, this.RS_LOCALVIEWER = 142, this.RS_NORMALIZENORMALS = 143, this.RS_DIFFUSEMATERIALSOURCE = 145, this.RS_SPECULARMATERIALSOURCE = 146, this.RS_AMBIENTMATERIALSOURCE = 147, this.RS_EMISSIVEMATERIALSOURCE = 148, this.RS_VERTEXBLEND = 151, this.RS_CLIPPLANEENABLE = 152, this.RS_POINTSIZE = 154, this.RS_POINTSIZE_MIN = 155, this.RS_POINTSPRITEENABLE = 156, this.RS_POINTSCALEENABLE = 157, this.RS_POINTSCALE_A = 158, this.RS_POINTSCALE_B = 159, this.RS_POINTSCALE_C = 160, this.RS_MULTISAMPLEANTIALIAS = 161, this.RS_MULTISAMPLEMASK = 162, this.RS_PATCHEDGESTYLE = 163, this.RS_DEBUGMONITORTOKEN = 165, this.RS_POINTSIZE_MAX = 166, this.RS_INDEXEDVERTEXBLENDENABLE = 167, this.RS_COLORWRITEENABLE = 168, this.RS_TWEENFACTOR = 170, this.RS_BLENDOP = 171, this.RS_POSITIONDEGREE = 172, this.RS_NORMALDEGREE = 173, this.RS_SCISSORTESTENABLE = 174, this.RS_SLOPESCALEDEPTHBIAS = 175, this.RS_ANTIALIASEDLINEENABLE = 176, this.RS_TWOSIDEDSTENCILMODE = 185, this.RS_CCW_STENCILFAIL = 186, this.RS_CCW_STENCILZFAIL = 187, this.RS_CCW_STENCILPASS = 188, this.RS_CCW_STENCILFUNC = 189, this.RS_COLORWRITEENABLE1 = 190, this.RS_COLORWRITEENABLE2 = 191, this.RS_COLORWRITEENABLE3 = 192, this.RS_BLENDFACTOR = 193, this.RS_SRGBWRITEENABLE = 194, this.RS_DEPTHBIAS = 195, this.RS_SEPARATEALPHABLENDENABLE = 206, this.RS_SRCBLENDALPHA = 207, this.RS_DESTBLENDALPHA = 208, this.RS_BLENDOPALPHA = 209, this.CULL_NONE = 1, this.CULL_CW = 2, this.CULL_CCW = 3, this.CMP_NEVER = 1, this.CMP_LESS = 2, this.CMP_EQUAL = 3, this.CMP_LEQUAL = 4, this.CMP_GREATER = 5, this.CMP_NOTEQUAL = 6, this.CMP_GREATEREQUAL = 7, this.CMP_ALWAYS = 8, this.BLEND_ZERO = 1, this.BLEND_ONE = 2, this.BLEND_SRCCOLOR = 3, this.BLEND_INVSRCCOLOR = 4, this.BLEND_SRCALPHA = 5, this.BLEND_INVSRCALPHA = 6, this.BLEND_DESTALPHA = 7, this.BLEND_INVDESTALPHA = 8, this.BLEND_DESTCOLOR = 9, this.BLEND_INVDESTCOLOR = 10, this.BLEND_SRCALPHASAT = 11, this.BLEND_BOTHSRCALPHA = 12, this.BLEND_BOTHINVSRCALPHA = 13, this.BLEND_BLENDFACTOR = 14, this.BLEND_INVBLENDFACTOR = 15, this.gl = null, this.debugMode = !1, this.mipLevelSkipCount = 0, this.shaderModel = "hi", this.enableAnisotropicFiltering = !0, this.effectDir = "/effect.gles2/", this._scheduled = [], this._quadBuffer = null, this._cameraQuadBuffer = null, this._currentRenderMode = null, this._whiteTexture = null, this._whiteCube = null, this.world = mat4.create(), mat4.identity(this.world), this.worldInverse = mat4.create(), mat4.identity(this.worldInverse), this.view = mat4.create(), mat4.identity(this.view), this.viewInv = mat4.create(), mat4.identity(this.viewInv), this.projection = mat4.create(), mat4.identity(this.projection), this.eyePosition = vec3.create(), this.perObjectData = null, variableStore.RegisterVariable("WorldMat", this.world), variableStore.RegisterVariable("ViewMat", this.view), variableStore.RegisterVariable("ProjectionMat", this.projection), variableStore.RegisterType("ViewProjectionMat", Tw2MatrixParameter), variableStore.RegisterType("ViewportSize", Tw2Vector4Parameter), variableStore.RegisterType("Time", Tw2Vector4Parameter), this.frameCounter = 0, this.startTime = new Date, this.CreateDevice = function (canvas, params) {
            function tick() {
                requestAnimFrame(tick), self.Tick()
            }

            this.gl = null;
            try {
                this.gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params)
            } catch (e) {
            }
            if (!this.gl) return console.error("Could not initialise WebGL"), !1;
            if (this.debugMode && (this.gl = WebGLDebugUtils.makeDebugContext(this.gl)), this.gl.getExtension("OES_standard_derivatives"), this.alphaBlendBackBuffer = !params || "undefined" == typeof params.alpha || params.alpha, this.msaaSamples = this.gl.getParameter(this.gl.SAMPLES), this.antialiasing = this.msaaSamples > 1, this.anisotropicFilter = this.gl.getExtension("EXT_texture_filter_anisotropic") || this.gl.getExtension("MOZ_EXT_texture_filter_anisotropic") || this.gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic"), this.anisotropicFilter && (this.anisotropicFilter.maxAnisotropy = this.gl.getParameter(this.anisotropicFilter.MAX_TEXTURE_MAX_ANISOTROPY_EXT)), this.shaderTextureLod = this.gl.getExtension("EXT_shader_texture_lod"), this.shaderBinary = this.gl.getExtension("CCP_shader_binary"), this.useBinaryShaders = !1, this.effectDir = "/effect.gles2/", this.shaderBinary) {
                var renderer = this.gl.getParameter(this.gl.RENDERER),
                    maliVer = renderer.match(/Mali-(\w+).*/);
                maliVer && (this.effectDir = "/effect.gles2.mali" + maliVer[1] + "/", this.useBinaryShaders = !0)
            }
            canvas.width = canvas.clientWidth, canvas.height = canvas.clientHeight, this.viewportWidth = canvas.clientWidth, this.viewportHeight = canvas.clientHeight, this.canvas = canvas;
            var self = this;
            this._quadBuffer = this.gl.createBuffer(), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._quadBuffer);
            var vertices = [1, 1, 0, 1, 1, 1, -1, 1, 0, 1, 0, 1, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 0, 0];
            return this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW), this._cameraQuadBuffer = this.gl.createBuffer(), this._quadDecl = new Tw2VertexDeclaration, this._quadDecl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_POSITION, 0, this.gl.FLOAT, 4, 0)), this._quadDecl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 0, this.gl.FLOAT, 2, 16)), this._quadDecl.RebuildHash(), this.alphaTestState = {}, this.alphaTestState.states = {}, this.alphaTestState.states[this.RS_ALPHATESTENABLE] = 0, this.alphaTestState.states[this.RS_ALPHAREF] = -1, this.alphaTestState.states[this.RS_ALPHAFUNC] = this.CMP_GREATER, this.alphaTestState.states[this.RS_CLIPPING] = 0, this.alphaTestState.states[this.RS_CLIPPLANEENABLE] = 0, this.alphaTestState.dirty = !1, this.alphaBlendState = {}, this.alphaBlendState.states = {}, this.alphaBlendState.states[this.RS_SRCBLEND] = this.BLEND_SRCALPHA, this.alphaBlendState.states[this.RS_DESTBLEND] = this.BLEND_INVSRCALPHA, this.alphaBlendState.states[this.RS_BLENDOP] = this.BLENDOP_ADD, this.alphaBlendState.states[this.RS_SEPARATEALPHABLENDENABLE] = 0, this.alphaBlendState.states[this.RS_BLENDOPALPHA] = this.BLENDOP_ADD, this.alphaBlendState.states[this.RS_SRCBLENDALPHA] = this.BLEND_SRCALPHA, this.alphaBlendState.states[this.RS_DESTBLENDALPHA] = this.BLEND_INVSRCALPHA, this.alphaBlendState.dirty = !1, this.depthOffsetState = {}, this.depthOffsetState.states = {}, this.depthOffsetState.states[this.RS_SLOPESCALEDEPTHBIAS] = 0, this.depthOffsetState.states[this.RS_DEPTHBIAS] = 0, this.depthOffsetState.dirty = !1, this._blendTable = [-1, this.gl.ZERO, this.gl.ONE, this.gl.SRC_COLOR, this.gl.ONE_MINUS_SRC_COLOR, this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.DST_ALPHA, this.gl.ONE_MINUS_DST_ALPHA, this.gl.DST_COLOR, this.gl.ONE_MINUS_DST_COLOR, this.gl.SRC_ALPHA_SATURATE, -1, -1, this.gl.CONSTANT_COLOR, this.gl.ONE_MINUS_CONSTANT_COLOR], this._shadowStateBuffer = new Float32Array(24), this._prevTime = null, requestAnimFrame(tick), !0
        }, this.Schedule = function (render) {
            this._scheduled[this._scheduled.length] = render
        }, this.Tick = function () {
            (this.canvas.clientWidth != this.viewportWidth || this.canvas.clientHeight != this.viewportHeight) && (this.canvas.width = this.canvas.clientWidth, this.canvas.height = this.canvas.clientHeight, this.viewportWidth = this.canvas.clientWidth, this.viewportHeight = this.canvas.clientHeight);
            var now = new Date;
            now = now.getTime();
            var currentTime = .001 * (now - this.startTime),
                time = variableStore._variables.Time.value;
            time[3] = time[0], time[0] = currentTime, time[1] = currentTime - Math.floor(currentTime), time[2] = this.frameCounter;
            var viewportSize = variableStore._variables.ViewportSize.value;
            viewportSize[0] = this.viewportWidth, viewportSize[1] = this.viewportHeight, viewportSize[2] = this.viewportWidth, viewportSize[3] = this.viewportHeight;
            var dt = null == this._prevTime ? 0 : .001 * (now - this._prevTime);
            this._prevTime = now, resMan.PrepareLoop(dt);
            for (var i = 0; i < this._scheduled.length; ++i) this._scheduled[i](dt) || (this._scheduled.splice(i, 1), --i);
            this.frameCounter++
        }, this.SetWorld = function (matrix) {
            mat4.set(matrix, this.world)
        }, this.SetView = function (matrix) {
            mat4.set(matrix, this.view), mat4.multiply(this.projection, this.view, variableStore._variables.ViewProjectionMat.value), mat4.inverse(this.view, this.viewInv), this.eyePosition.set([this.viewInv[12], this.viewInv[13], this.viewInv[14]])
        }, this.SetProjection = function (matrix) {
            mat4.set(matrix, this.projection), mat4.multiply(this.projection, this.view, variableStore._variables.ViewProjectionMat.value)
        }, this.GetEyePosition = function () {
            return this.eyePosition
        }, this.RenderFullScreenQuad = function (effect) {
            if (effect) {
                var effectRes = effect.GetEffectRes();
                if (effectRes.IsGood()) {
                    device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._quadBuffer);
                    for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
                        if (effect.ApplyPass(pass), !this._quadDecl.SetDeclaration(effect.GetPassInput(pass), 24)) return !1;
                        this.ApplyShadowState(), device.gl.drawArrays(device.gl.TRIANGLE_STRIP, 0, 4)
                    }
                }
            }
        }, this.RenderTexture = function (texture) {
            if (!this.blitEffect) {
                this.blitEffect = new Tw2Effect, this.blitEffect.effectFilePath = "res:/graphics/effect/managed/space/system/blit.fx";
                var param = new Tw2TextureParameter;
                param.name = "BlitSource", this.blitEffect.parameters[param.name] = param, this.blitEffect.Initialize()
            }
            this.blitEffect.parameters.BlitSource.textureRes = texture, this.RenderFullScreenQuad(this.blitEffect)
        }, this.RenderCameraSpaceQuad = function (effect) {
            if (effect) {
                var effectRes = effect.GetEffectRes();
                if (effectRes.IsGood()) {
                    var vertices = [1, 1, 0, 1, 1, 1, -1, 1, 0, 1, 0, 1, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 0, 0];
                    vertices = new Float32Array(vertices);
                    for (var projInv = mat4.inverse(this.projection, mat4.create()), i = 0; 4 > i; ++i) {
                        var vec = vertices.subarray(6 * i, 6 * i + 4);
                        mat4.multiplyVec4(projInv, vec), vec3.scale(vec, 1 / vec[3]), vec[3] = 1
                    }
                    this.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._cameraQuadBuffer), this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
                    for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
                        if (effect.ApplyPass(pass), !this._quadDecl.SetDeclaration(effect.GetPassInput(pass), 24)) return !1;
                        this.ApplyShadowState(), device.gl.drawArrays(device.gl.TRIANGLE_STRIP, 0, 4)
                    }
                }
            }
        }, this._DwordToFloat = function (value) {
            var b4 = 255 & value,
                b3 = (65280 & value) >> 8,
                b2 = (16711680 & value) >> 16,
                b1 = (4278190080 & value) >> 24,
                sign = 1 - 2 * (b1 >> 7),
                exp = (b1 << 1 & 255 | b2 >> 7) - 127,
                sig = (127 & b2) << 16 | b3 << 8 | b4;
            return 0 == sig && -127 == exp ? 0 : sign * (1 + sig * Math.pow(2, -23)) * Math.pow(2, exp)
        }, this.IsAlphaTestEnabled = function () {
            return this.alphaTestState.states[this.RS_ALPHATESTENABLE]
        }, this.SetRenderState = function (state, value) {
            this._currentRenderMode = this.RM_ANY;
            var gl = this.gl;
            switch (state) {
                case this.RS_ZENABLE:
                    return void(value ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST));
                case this.RS_ZWRITEENABLE:
                    return void gl.depthMask(value ? !0 : !1);
                case this.RS_ALPHATESTENABLE:
                case this.RS_ALPHAREF:
                case this.RS_ALPHAFUNC:
                case this.RS_CLIPPING:
                case this.RS_CLIPPLANEENABLE:
                    return void(this.alphaTestState[state] != value && (this.alphaTestState.states[state] = value, this.alphaTestState.dirty = !0));
                case this.RS_SRCBLEND:
                case this.RS_DESTBLEND:
                case this.RS_BLENDOP:
                case this.RS_SEPARATEALPHABLENDENABLE:
                case this.RS_BLENDOPALPHA:
                case this.RS_SRCBLENDALPHA:
                case this.RS_DESTBLENDALPHA:
                    return void(this.alphaBlendState[state] != value && (this.alphaBlendState.states[state] = value, this.alphaBlendState.dirty = !0));
                case this.RS_CULLMODE:
                    switch (value) {
                        case this.CULL_NONE:
                            return void gl.disable(gl.CULL_FACE);
                        case this.CULL_CW:
                            return gl.enable(gl.CULL_FACE), void gl.cullFace(gl.FRONT);
                        case this.CULL_CCW:
                            return gl.enable(gl.CULL_FACE), void gl.cullFace(gl.BACK)
                    }
                    return;
                case this.RS_ZFUNC:
                    return void gl.depthFunc(512 + value - 1);
                case this.RS_ALPHABLENDENABLE:
                    return void(value ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND));
                case this.RS_COLORWRITEENABLE:
                    return void gl.colorMask(0 != (1 & value), 0 != (2 & value), 0 != (4 & value), 0 != (8 & value));
                case this.RS_SCISSORTESTENABLE:
                    return void(value ? gl.enable(gl.SCISSOR_TEST) : gl.disable(gl.SCISSOR_TEST));
                case this.RS_SLOPESCALEDEPTHBIAS:
                case this.RS_DEPTHBIAS:
                    return value = this._DwordToFloat(value), void(this.depthOffsetState[state] != value && (this.depthOffsetState.states[state] = value, this.depthOffsetState.dirty = !0))
            }
        }, this.shadowHandles = null, this.ApplyShadowState = function () {
            if (this.alphaBlendState.dirty) {
                var blendOp = this.gl.FUNC_ADD;
                2 == this.alphaBlendState.states[this.RS_BLENDOP] ? blendOp = this.gl.FUNC_SUBTRACT : 3 == this.alphaBlendState.states[this.RS_BLENDOP] && (blendOp = this.gl.FUNC_REVERSE_SUBTRACT);
                var srcBlend = this._blendTable[this.alphaBlendState.states[this.RS_SRCBLEND]],
                    destBlend = this._blendTable[this.alphaBlendState.states[this.RS_DESTBLEND]];
                if (this.alphaBlendState.states[this.RS_SEPARATEALPHABLENDENABLE]) {
                    var blendOpAlpha = this.gl.FUNC_ADD;
                    2 == this.alphaBlendState.states[this.RS_BLENDOP] ? blendOpAlpha = this.gl.FUNC_SUBTRACT : 3 == this.alphaBlendState.states[this.RS_BLENDOP] && (blendOpAlpha = this.gl.FUNC_REVERSE_SUBTRACT);
                    var srcBlendAlpha = this._blendTable[this.alphaBlendState.states[this.RS_SRCBLENDALPHA]],
                        destBlendAlpha = this._blendTable[this.alphaBlendState.states[this.RS_DESTBLENDALPHA]];
                    this.gl.blendEquationSeparate(blendOp, blendOpAlpha), this.gl.blendFuncSeparate(srcBlend, destBlend, srcBlendAlpha, destBlendAlpha)
                } else this.gl.blendEquation(blendOp), this.gl.blendFunc(srcBlend, destBlend);
                this.alphaBlendState.dirty = !1
            }
            if (this.depthOffsetState.dirty && (this.gl.polygonOffset(this.depthOffsetState.states[this.RS_SLOPESCALEDEPTHBIAS], this.depthOffsetState.states[this.RS_DEPTHBIAS]), this.depthOffsetState.dirty = !1), this.shadowHandles && this.alphaTestState.states[this.RS_ALPHATESTENABLE]) {
                switch (this.alphaTestState.states[this.RS_ALPHAFUNC]) {
                    case this.CMP_NEVER:
                        var alphaTestFunc = 0,
                            invertedAlphaTest = 1,
                            alphaTestRef = -256;
                        break;
                    case this.CMP_LESS:
                        var alphaTestFunc = 0,
                            invertedAlphaTest = -1,
                            alphaTestRef = this.alphaTestState.states[this.RS_ALPHAREF] - 1;
                        break;
                    case this.CMP_EQUAL:
                        var alphaTestFunc = 1,
                            invertedAlphaTest = 0,
                            alphaTestRef = this.alphaTestState.states[this.RS_ALPHAREF];
                        break;
                    case this.CMP_LEQUAL:
                        var alphaTestFunc = 0,
                            invertedAlphaTest = -1,
                            alphaTestRef = this.alphaTestState.states[this.RS_ALPHAREF];
                        break;
                    case this.CMP_GREATER:
                        var alphaTestFunc = 0,
                            invertedAlphaTest = 1,
                            alphaTestRef = -this.alphaTestState.states[this.RS_ALPHAREF] - 1;
                        break;
                    case this.CMP_GREATEREQUAL:
                        var alphaTestFunc = 0,
                            invertedAlphaTest = 1,
                            alphaTestRef = -this.alphaTestState.states[this.RS_ALPHAREF];
                        break;
                    default:
                        var alphaTestFunc = 0,
                            invertedAlphaTest = 0,
                            alphaTestRef = 1
                }
                var clipPlaneEnable = 0;
                device.gl.uniform4f(this.shadowHandles.shadowStateInt, invertedAlphaTest, alphaTestRef, alphaTestFunc, clipPlaneEnable)
            }
        }, this.SetStandardStates = function (renderMode) {
            if (this._currentRenderMode != renderMode) {
                switch (this.gl.frontFace(this.gl.CW), renderMode) {
                    case this.RM_OPAQUE:
                        this.SetRenderState(this.RS_ZENABLE, !0), this.SetRenderState(this.RS_ZWRITEENABLE, !0), this.SetRenderState(this.RS_ZFUNC, this.CMP_LEQUAL), this.SetRenderState(this.RS_CULLMODE, this.CULL_CW), this.SetRenderState(this.RS_ALPHABLENDENABLE, !1), this.SetRenderState(this.RS_ALPHATESTENABLE, !1), this.SetRenderState(this.RS_SEPARATEALPHABLENDENABLE, !1), this.SetRenderState(this.RS_SLOPESCALEDEPTHBIAS, 0), this.SetRenderState(this.RS_DEPTHBIAS, 0), this.SetRenderState(this.RS_COLORWRITEENABLE, 15);
                        break;
                    case this.RM_DECAL:
                        this.SetRenderState(this.RS_ALPHABLENDENABLE, !1), this.SetRenderState(this.RS_ALPHATESTENABLE, !0), this.SetRenderState(this.RS_ALPHAFUNC, this.CMP_GREATER), this.SetRenderState(this.RS_ALPHAREF, 127), this.SetRenderState(this.RS_ZENABLE, !0), this.SetRenderState(this.RS_ZWRITEENABLE, !0), this.SetRenderState(this.RS_ZFUNC, this.CMP_LEQUAL), this.SetRenderState(this.RS_CULLMODE, this.CULL_CW), this.SetRenderState(this.RS_BLENDOP, this.BLENDOP_ADD), this.SetRenderState(this.RS_SLOPESCALEDEPTHBIAS, 0), this.SetRenderState(this.RS_DEPTHBIAS, 0), this.SetRenderState(this.RS_SEPARATEALPHABLENDENABLE, !1), this.SetRenderState(this.RS_COLORWRITEENABLE, 15);
                        break;
                    case this.RM_TRANSPARENT:
                        this.SetRenderState(this.RS_CULLMODE, this.CULL_CW), this.SetRenderState(this.RS_ALPHABLENDENABLE, !0), this.SetRenderState(this.RS_SRCBLEND, this.BLEND_SRCALPHA), this.SetRenderState(this.RS_DESTBLEND, this.BLEND_INVSRCALPHA), this.SetRenderState(this.RS_BLENDOP, this.BLENDOP_ADD), this.SetRenderState(this.RS_ZENABLE, !0), this.SetRenderState(this.RS_ZWRITEENABLE, !1), this.SetRenderState(this.RS_ZFUNC, this.CMP_LEQUAL), this.SetRenderState(this.RS_ALPHATESTENABLE, !1), this.SetRenderState(this.RS_SLOPESCALEDEPTHBIAS, 0), this.SetRenderState(this.RS_DEPTHBIAS, 0), this.SetRenderState(this.RS_SEPARATEALPHABLENDENABLE, !1), this.SetRenderState(this.RS_COLORWRITEENABLE, 15);
                        break;
                    case this.RM_ADDITIVE:
                        this.SetRenderState(this.RS_CULLMODE, this.CULL_NONE), this.SetRenderState(this.RS_ALPHABLENDENABLE, !0), this.SetRenderState(this.RS_SRCBLEND, this.BLEND_ONE), this.SetRenderState(this.RS_DESTBLEND, this.BLEND_ONE), this.SetRenderState(this.RS_BLENDOP, this.BLENDOP_ADD), this.SetRenderState(this.RS_ZENABLE, !0), this.SetRenderState(this.RS_ZWRITEENABLE, !1), this.SetRenderState(this.RS_ZFUNC, this.CMP_LEQUAL), this.SetRenderState(this.RS_ALPHATESTENABLE, !1), this.SetRenderState(this.RS_SLOPESCALEDEPTHBIAS, 0), this.SetRenderState(this.RS_DEPTHBIAS, 0), this.SetRenderState(this.RS_SEPARATEALPHABLENDENABLE, !1), this.SetRenderState(this.RS_COLORWRITEENABLE, 15);
                        break;
                    case this.RM_FULLSCREEN:
                        this.SetRenderState(this.RS_ALPHABLENDENABLE, !1), this.SetRenderState(this.RS_ALPHATESTENABLE, !1), this.SetRenderState(this.RS_CULLMODE, this.CULL_NONE), this.SetRenderState(this.RS_ZENABLE, !1), this.SetRenderState(this.RS_ZWRITEENABLE, !1), this.SetRenderState(this.RS_ZFUNC, this.CMP_ALWAYS), this.SetRenderState(this.RS_SLOPESCALEDEPTHBIAS, 0), this.SetRenderState(this.RS_DEPTHBIAS, 0), this.SetRenderState(this.RS_SEPARATEALPHABLENDENABLE, !1), this.SetRenderState(this.RS_COLORWRITEENABLE, 15);
                        break;
                    default:
                        return
                }
                this._currentRenderMode = renderMode
            }
        }, this.GetFallbackTexture = function () {
            return null == this._whiteTexture && (this._whiteTexture = device.gl.createTexture(), device.gl.bindTexture(device.gl.TEXTURE_2D, this._whiteTexture), device.gl.texImage2D(device.gl.TEXTURE_2D, 0, device.gl.RGBA, 1, 1, 0, device.gl.RGBA, device.gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0])), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_WRAP_S, device.gl.CLAMP_TO_EDGE), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_WRAP_T, device.gl.CLAMP_TO_EDGE), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_MAG_FILTER, device.gl.NEAREST), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_MIN_FILTER, device.gl.NEAREST), device.gl.bindTexture(device.gl.TEXTURE_2D, null)), this._whiteTexture
        }, this.GetFallbackCubeMap = function () {
            if (null == this._whiteCube) {
                this._whiteCube = device.gl.createTexture(), device.gl.bindTexture(device.gl.TEXTURE_CUBE_MAP, this._whiteCube);
                for (var j = 0; 6 > j; ++j) device.gl.texImage2D(device.gl.TEXTURE_CUBE_MAP_POSITIVE_X + j, 0, device.gl.RGBA, 1, 1, 0, device.gl.RGBA, device.gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
                device.gl.texParameteri(device.gl.TEXTURE_CUBE_MAP, device.gl.TEXTURE_WRAP_S, device.gl.CLAMP_TO_EDGE), device.gl.texParameteri(device.gl.TEXTURE_CUBE_MAP, device.gl.TEXTURE_WRAP_T, device.gl.CLAMP_TO_EDGE), device.gl.texParameteri(device.gl.TEXTURE_CUBE_MAP, device.gl.TEXTURE_MAG_FILTER, device.gl.NEAREST), device.gl.texParameteri(device.gl.TEXTURE_CUBE_MAP, device.gl.TEXTURE_MIN_FILTER, device.gl.NEAREST), device.gl.bindTexture(device.gl.TEXTURE_CUBE_MAP, null)
            }
            return this._whiteCube
        }
    }

    function Tw2BatchAccumulator(sorting) {
        this.batches = [], this.count = 0, this._sortMethod = sorting
    }

    function Tw2RenderBatch() {
        this.renderMode = device.RM_ANY, this.perObjectData = null
    }

    function Tw2ForwardingRenderBatch() {
        this.geometryProvider = null
    }

    function Tw2GeometryBatch() {
        this._super.constructor.call(this), this.geometryRes = null, this.meshIx = 0, this.start = 0, this.count = 1, this.effect = null, this.batchDepth = 0
    }

    function Tw2GeometryLineBatch() {
        this._super.constructor.call(this), this.geometryRes = null, this.meshIx = 0, this.start = 0, this.count = 1, this.effect = null, this.batchDepth = 0
    }

    function Tw2GeometryMeshArea() {
        this.name = "", this.start = 0, this.count = 0, this.minBounds = vec3.create(), this.maxBounds = vec3.create(), this.boundsSpherePosition = vec3.create(), this.boundsSphereRadius = 0
    }

    function Tw2GeometryMeshBinding() {
        this.mesh = null, this.bones = []
    }

    function Tw2GeometryModel() {
        this.name = "", this.meshBindings = [], this.skeleton = null
    }

    function Tw2GeometrySkeleton() {
        this.bones = []
    }

    function Tw2GeometryBone() {
        this.name = "", this.parentIndex = -1, this.position = vec3.create(), this.orientation = quat4.create(), this.scaleShear = mat3.create(), this.localTransform = mat4.create(), this.worldTransform = mat4.create(), this.worldTransformInv = mat4.create()
    }

    function Tw2GeometryAnimation() {
        this.name = "", this.duration = 0, this.trackGroups = []
    }

    function Tw2GeometryTrackGroup() {
        this.name = "", this.model = null, this.transformTracks = []
    }

    function Tw2GeometryTransformTrack() {
        this.name = "", this.position = null, this.orientation = null, this.scaleShear = null
    }

    function Tw2GeometryCurve() {
        this.dimension = 0, this.degree = 0, this.knots = null, this.controls = null
    }

    function Tw2BlendShapeData() {
        this.name = "", this.declaration = new Tw2VertexDeclaration, this.buffers = [], this.indexes = null, this.weightProxy = null
    }

    function Tw2GeometryMesh() {
        this.name = "", this.declaration = new Tw2VertexDeclaration, this.areas = [], this.buffer = null, this.bufferData = null, this.indexes = null, this.indexType = 0, this.minBounds = vec3.create(), this.maxBounds = vec3.create(), this.boundsSpherePosition = vec3.create(), this.boundsSphereRadius = 0, this.bones = []
    }

    function Tw2GeometryRes() {
        this._super.constructor.call(this), this.meshes = [], this.minBounds = vec3.create(), this.maxBounds = vec3.create(), this.boundsSpherePosition = vec3.create(), this.boundsSphereRadius = 0, this.models = [], this.animations = [], this.systemMirror = !1, this._instanceCount = 1
    }

    function boundsIncludePoint(minBounds, maxBounds, point) {
        minBounds[0] > point[0] && (minBounds[0] = point[0]), minBounds[1] > point[1] && (minBounds[1] = point[1]), minBounds[2] > point[2] && (minBounds[2] = point[2]), maxBounds[0] < point[0] && (maxBounds[0] = point[0]), maxBounds[1] < point[1] && (maxBounds[1] = point[1]), maxBounds[2] < point[2] && (maxBounds[2] = point[2])
    }

    function Tw2TextureRes() {
        this._super.constructor.call(this), this.texture = null, this.isCube = !1, this.images = [], this.width = 0, this.height = 0, this._facesLoaded = 0, this.hasMipMaps = !1, this._currentSampler = 0
    }

    function Tw2EffectRes() {
        this._super.constructor.call(this), this.passes = [], this.annotations = {}
    }

    function Tw2SamplerOverride() {
        this.name = "", this.addressU = 0, this.addressV = 0, this.addressW = 0, this.filter = 0, this.mipFilter = 0, this.lodBias = 0, this.maxMipLevel = 0, this.maxAnisotropy = 0;
        var sampler = null;
        this.GetSampler = function (originalSampler) {
            if (!sampler) {
                if (sampler = new Tw2SamplerState, sampler.registerIndex = originalSampler.registerIndex, sampler.name = originalSampler.name, 1 == this.filter) {
                    switch (this.mipFilter) {
                        case 0:
                            sampler.minFilter = device.gl.NEAREST;
                            break;
                        case 1:
                            sampler.minFilter = device.gl.NEAREST_MIPMAP_NEAREST;
                            break;
                        default:
                            sampler.minFilter = device.gl.NEAREST_MIPMAP_LINEAR
                    }
                    sampler.minFilterNoMips = device.gl.NEAREST
                } else {
                    switch (this.mipFilter) {
                        case 0:
                            sampler.minFilter = device.gl.LINEAR;
                            break;
                        case 1:
                            sampler.minFilter = device.gl.LINEAR_MIPMAP_NEAREST;
                            break;
                        default:
                            sampler.minFilter = device.gl.LINEAR_MIPMAP_LINEAR
                    }
                    sampler.minFilterNoMips = device.gl.LINEAR
                }
                sampler.magFilter = 1 == this.filter ? device.gl.NEAREST : device.gl.LINEAR;
                var wrapModes = [0, device.gl.REPEAT, device.gl.MIRRORED_REPEAT, device.gl.CLAMP_TO_EDGE, device.gl.CLAMP_TO_EDGE, device.gl.CLAMP_TO_EDGE];
                sampler.addressU = wrapModes[this.addressU], sampler.addressV = wrapModes[this.addressV], sampler.addressW = wrapModes[this.addressW], (3 == this.filter || 3 == this.mipFilter) && (sampler.anisotropy = Math.max(this.maxAnisotropy, 1)), sampler.samplerType = originalSampler.samplerType, sampler.isVolume = originalSampler.isVolume, sampler.ComputeHash()
            }
            return sampler
        }
    }

    function Tw2Effect() {
        this.name = "", this.effectFilePath = "", this.effectRes = null, this.parameters = {}, this.passes = [], this.samplerOverrides = []
    }

    function Tw2MeshArea() {
        this.name = "", this.effect = null, this.meshIndex = 0, this.index = 0, this.count = 1, this.debugIsHidden = !1
    }

    function Tw2MeshLineArea() {
        this.name = "", this.effect = null, this.meshIndex = 0, this.index = 0, this.count = 1, this.debugIsHidden = !1
    }

    function Tw2Mesh() {
        this.name = "", this.meshIndex = 0, this.geometryResPath = "", this.lowDetailGeometryResPath = "", this.geometryResource = null, this.opaqueAreas = [], this.transparentAreas = [], this.transparentAreas = [], this.additiveAreas = [], this.pickableAreas = [], this.decalAreas = [], this.depthAreas = [], this.debugIsHidden = !1
    }

    function Tw2Track() {
        this.trackRes = null, this.bone = null
    }

    function Tw2TrackGroup() {
        this.trackGroupRes = null, this.model = null, this.transformTracks = []
    }

    function Tw2Animation() {
        this.animationRes = null, this.time = 0, this.timeScale = 1, this.cycle = !1, this.isPlaying = !1, this.callback = null, this.trackGroups = []
    }

    function Tw2Bone() {
        this.boneRes = null, this.localTransform = mat4.create(), this.worldTransform = mat4.create(), this.offsetTransform = mat4.create()
    }

    function Tw2Model() {
        this.modelRes = null, this.bones = [], this.bonesByName = {}
    }

    function Tw2AnimationController(geometryResource) {
        this.geometryResources = [], this.models = [], this.animations = [], this.meshBindings = [], this.loaded = !1, this.update = !0, this._tempMat4 = mat4.create(), this._tempMat3 = mat3.create(), this._tempQuat4 = quat4.create(), this._tempVec3 = vec3.create(), this._geometryResource = null, "undefined" != typeof geometryResource && this.SetGeometryResource(geometryResource)
    }

    function Tw2RenderTarget() {
        this.texture = null, this._frameBuffer = null, this.width = null, this.height = null, this.hasDepth = null
    }

    function Tw2CurveSet() {
        this.name = "", this.curves = [], this.bindings = [], this.scale = 1, this.playOnLoad = !0, this.isPlaying = !1, this.scaledTime = 0
    }

    function Tw2ValueBinding() {
        this.name = "", this.sourceObject = null, this.sourceAttribute = "", this.destinationObject = null, this.destinationAttribute = "", this.scale = 1, this.offset = quat4.create(), this._copyFunc = null, this._sourceElement = 0, this._destinationElement = 0
    }

    function Tw2Float() {
        this.value = 0
    }

    function Tw2PostProcess() {
        this.width = 0, this.height = 0, this.texture = null, this.quadRT0 = new Tw2RenderTarget, this.quadRT1 = new Tw2RenderTarget, this.steps = [], this.steps[0] = new Tw2Effect, this.steps[0] = {
            effect: new Tw2Effect,
            rt: this.quadRT1,
            inputs: {
                BlitCurrent: null
            }
        }, this.steps[0].effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/PostProcess/ColorDownFilter4.fx", this.steps[0].effect.Initialize(), this.steps[0].effect.parameters.BlitCurrent = new Tw2TextureParameter("BlitCurrent"), this.steps[0].effect.parameters.g_texelSize = new Tw2Vector4Parameter("g_texelSize"), this.steps[1] = new Tw2Effect, this.steps[1] = {
            effect: new Tw2Effect,
            rt: this.quadRT0,
            inputs: {
                BlitCurrent: this.quadRT1
            }
        }, this.steps[1].effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/PostProcess/ColorHighPassFilter.fx", this.steps[1].effect.Initialize(), this.steps[1].effect.parameters.BlitCurrent = new Tw2TextureParameter("BlitCurrent"), this.steps[1].effect.parameters.LuminanceThreshold = new Tw2FloatParameter("LuminanceThreshold", .85), this.steps[1].effect.parameters.LuminanceScale = new Tw2FloatParameter("LuminanceScale", 2), this.steps[2] = new Tw2Effect, this.steps[2] = {
            effect: new Tw2Effect,
            rt: this.quadRT1,
            inputs: {
                BlitCurrent: this.quadRT0
            }
        }, this.steps[2].effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/PostProcess/ColorExpBlurHorizontalBig.fx", this.steps[2].effect.Initialize(), this.steps[2].effect.parameters.BlitCurrent = new Tw2TextureParameter("BlitCurrent"), this.steps[2].effect.parameters.g_texelSize = new Tw2Vector4Parameter("g_texelSize"), this.steps[3] = new Tw2Effect, this.steps[3] = {
            effect: new Tw2Effect,
            rt: this.quadRT0,
            inputs: {
                BlitCurrent: this.quadRT1
            }
        }, this.steps[3].effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/PostProcess/ColorExpBlurVerticalBig.fx", this.steps[3].effect.Initialize(), this.steps[3].effect.parameters.BlitCurrent = new Tw2TextureParameter("BlitCurrent"), this.steps[3].effect.parameters.g_texelSize = new Tw2Vector4Parameter("g_texelSize"), this.steps[4] = new Tw2Effect, this.steps[4] = {
            effect: new Tw2Effect,
            rt: null,
            inputs: {
                BlitCurrent: this.quadRT0,
                BlitOriginal: null
            }
        }, this.steps[4].effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/PostProcess/ColorUpFilter4_Add.fx", this.steps[4].effect.Initialize(), this.steps[4].effect.parameters.BlitCurrent = new Tw2TextureParameter("BlitCurrent"), this.steps[4].effect.parameters.BlitOriginal = new Tw2TextureParameter("BlitOriginal"), this.steps[4].effect.parameters.g_texelSize = new Tw2Vector4Parameter("g_texelSize"), this.steps[4].effect.parameters.ScalingFactor = new Tw2FloatParameter("ScalingFactor", 1)
    }

    function Tw2ColorKey() {
        this.time = 0, this.value = quat4.create(), this.left = quat4.create(), this.right = quat4.create(), this.interpolation = 0
    }

    function Tw2ColorCurve() {
        this.name = "", this.start = 0, this.length = 0, this.value = quat4.create(), this.extrapolation = 0, this.keys = [], this._currKey = 1
    }

    function Tw2ColorKey2() {
        this.time = 0, this.value = quat4.create(), this.leftTangent = quat4.create(), this.rightTangent = quat4.create(), this.interpolation = 1
    }

    function Tw2ColorCurve2() {
        this.name = "", this.length = 0, this.cycle = !1, this.reversed = !1, this.timeOffset = 0, this.timeScale = 1, this.startValue = quat4.create([0, 0, 0, 1]), this.currentValue = quat4.create([0, 0, 0, 1]), this.endValue = quat4.create([0, 0, 0, 1]), this.startTangent = quat4.create(), this.endTangent = quat4.create(), this.interpolation = 1, this.keys = []
    }

    function Tw2ColorSequencer() {
        this.name = "", this.start = 0, this.value = quat4.create(), this.operator = 0, this.functions = [], this._tempValue = quat4.create()
    }

    function Tw2EulerRotation() {
        this.name = "", this.yawCurve = null, this.pitchCurve = null, this.rollCurve = null, this.currentValue = quat4.create([0, 0, 0, 1])
    }

    function Tw2EventKey() {
        this.time = 0, this.value = ""
    }

    function Tw2EventCurve() {
        this.name = "", this.value = "", this.keys = [], this.extrapolation = 0, this._length = 0, this._time = 0, this._currentKey = 0
    }

    function Perlin_init() {
        var i = 0,
            j = 0,
            k = 0;
        for (i = 0; Perlin_B > i; i++) Perlin_p[i] = i, Perlin_g1[i] = 2 * Math.random() - 1;
        for (; --i;) k = Perlin_p[i], Perlin_p[i] = Perlin_p[j = Math.floor(Math.random() * Perlin_B)], Perlin_p[j] = k;
        for (i = 0; Perlin_B + 2 > i; i++) Perlin_p[Perlin_B + i] = Perlin_p[i], Perlin_g1[Perlin_B + i] = Perlin_g1[i]
    }

    function Perlin_noise1(arg) {
        Perlin_start && (Perlin_start = !1, Perlin_init());
        var t = arg + Perlin_N,
            bx0 = Math.floor(t) & Perlin_BM,
            bx1 = bx0 + 1 & Perlin_BM,
            rx0 = t - Math.floor(t),
            rx1 = rx0 - 1;
        return sx = rx0 * rx0 * (3 - 2 * rx0), u = rx0 * Perlin_g1[Perlin_p[bx0]], v = rx1 * Perlin_g1[Perlin_p[bx1]], u + sx * (v - u)
    }

    function PerlinNoise1D(x, alpha, beta, n) {
        for (var sum = 0, p = x, scale = 1, i = 0; n > i; ++i) sum += Perlin_noise1(p) / scale, scale *= alpha, p *= beta;
        return sum
    }

    function Tw2PerlinCurve() {
        this.name = "", this.start = 0, this.value = 0, this.speed = 1, this.alpha = 1.1, this.beta = 2, this.offset = 0, this.scale = 1, this.N = 3, this._startOffset = 100 * Math.random()
    }

    function Tw2QuaternionSequencer() {
        this.name = "", this.start = 0, this.value = quat4.create(), this.functions = [], this._tempValue = quat4.create()
    }

    function Tw2RandomConstantCurve() {
        this.name = "", this.value = 0, this.min = 0, this.max = 1, this.hold = !0
    }

    function Tw2RGBAScalarSequencer() {
        this.value = quat4.create(), this.RedCurve = null, this.GreenCurve = null, this.BlueCurve = null, this.AlphaCurve = null
    }

    function Tw2Torque() {
        this.time = 0, this.rot0 = quat4.create([0, 0, 0, 1]), this.omega0 = vec3.create(), this.torque = vec3.create()
    }

    function Tw2RigidOrientation() {
        this.name = "", this.I = 1, this.drag = 1, this.value = quat4.create([0, 0, 0, 1]), this.start = 0, this.states = [], this._tau = vec3.create(), this._tauConverter = quat4.create()
    }

    function Tw2QuaternionKey() {
        this.time = 0, this.value = quat4.create(), this.left = quat4.create(), this.right = quat4.create(), this.interpolation = 5
    }

    function Tw2RotationCurve() {
        this.name = "", this.start = 0, this.length = 0, this.value = quat4.create(), this.extrapolation = 0, this.keys = [], this._currKey = 1
    }

    function Tw2ScalarKey() {
        this.time = 0, this.value = 0, this.left = 0, this.right = 0, this.interpolation = 0
    }

    function Tw2ScalarCurve() {
        this.name = "", this.start = 0, this.timeScale = 1, this.timeOffset = 0, this.length = 0, this.value = 0, this.extrapolation = 0, this.keys = [], this._currKey = 1
    }

    function Tw2ScalarKey2() {
        this.time = 0, this.value = 0, this.leftTangent = 0, this.rightTangent = 0, this.interpolation = 1
    }

    function Tw2ScalarCurve2() {
        this.name = "", this.length = 0, this.cycle = !1, this.reversed = !1, this.timeOffset = 0, this.timeScale = 1, this.startValue = 0, this.currentValue = 0, this.endValue = 0, this.startTangent = 0, this.endTangent = 0, this.interpolation = 1, this.keys = []
    }

    function Tw2ScalarSequencer() {
        this.name = "", this.value = 0, this.operator = 0, this.functions = [], this.inMinClamp = 0, this.inMaxClamp = 1, this.outMinClamp = 0, this.outMaxClamp = 1, this.clamping = !1
    }

    function Tw2SineCurve() {
        this.name = "", this.value = 0, this.offset = 0, this.scale = 1, this.speed = 1
    }

    function Tw2TransformTrack() {
        this.name = "", this.resPath = "", this.res = null, this.group = "", this.cycle = !1, this.translation = vec3.create(), this.rotation = quat4.create([0, 0, 0, 1]), this.scale = vec3.create([1, 1, 1]), this.positionCurve = null, this.orientationCurve = null, this.scaleCurve = null, this._scaleShear = mat4.create()
    }

    function Tw2Vector2Key() {
        this.time = 0, this.value = new Float32Array(2), this.leftTangent = new Float32Array(2), this.rightTangent = new Float32Array(2), this.interpolation = 1
    }

    function Tw2Vector2Curve() {
        this.name = "", this.length = 0, this.cycle = !1, this.reversed = !1, this.timeOffset = 0, this.timeScale = 1, this.startValue = new Float32Array(2), this.currentValue = new Float32Array(2), this.endValue = new Float32Array(2), this.startTangent = new Float32Array(2), this.endTangent = new Float32Array(2), this.interpolation = 1, this.keys = []
    }

    function Tw2Vector3Key() {
        this.time = 0, this.value = vec3.create(), this.leftTangent = vec3.create(), this.rightTangent = vec3.create(), this.interpolation = 1
    }

    function Tw2Vector3Curve() {
        this.name = "", this.length = 0, this.cycle = !1, this.reversed = !1, this.timeOffset = 0, this.timeScale = 1, this.startValue = vec3.create(), this.currentValue = vec3.create(), this.endValue = vec3.create(), this.startTangent = vec3.create(), this.endTangent = vec3.create(), this.interpolation = 1, this.keys = []
    }

    function Tw2VectorKey() {
        this.time = 0, this.value = vec3.create(), this.left = vec3.create(), this.right = vec3.create(), this.interpolation = 0
    }

    function Tw2VectorCurve() {
        this.name = "", this.start = 0, this.length = 0, this.value = vec3.create(), this.extrapolation = 0, this.keys = [], this._currKey = 1
    }

    function Tw2VectorSequencer() {
        this.name = "", this.start = 0, this.value = vec3.create(), this.operator = 0, this.functions = [], this._tempValue = vec3.create()
    }

    function Tw2XYZScalarSequencer() {
        this.name = "", this.value = vec3.create(), this.XCurve = null, this.YCurve = null, this.ZCurve = null
    }

    function Tw2YPRSequencer() {
        this.name = "", this.value = quat4.create([0, 0, 0, 1]), this.YawPitchRoll = vec3.create(), this.YawCurve = null, this.PitchCurve = null, this.RollCurve = null
    }

    function Tw2MayaAnimationEngine() {
        this.curves = [], this.hermiteSegments = [], this.bezierSegments = [], this._currentCurveIndex = 0, this._evalCache = null
    }

    function ag_horner1(P, deg, s) {
        for (var h = P[deg]; --deg >= 0;) h = s * h + P[deg];
        return h
    }

    function ag_zeroin2(a, b, fa, fb, tol, pars) {
        var test, c, d, e, fc, del, m, machtol, p, q, r, s;
        machtol = 1.192092896e-7;
        for (var label1 = !0; ;) {
            if (label1 && (c = a, fc = fa, d = b - a, e = d), Math.abs(fc) < Math.abs(fb) && (a = b, b = c, c = a, fa = fb, fb = fc, fc = fa), label1 = !1, del = 2 * machtol * Math.abs(b) + .5 * tol, m = .5 * (c - b), test = Math.abs(m) > del && 0 != fb, !test) break;
            Math.abs(e) < del || Math.abs(fa) <= Math.abs(fb) ? (d = m, e = d) : (s = fb / fa, a == c ? (p = 2 * m * s, q = 1 - s) : (q = fa / fc, r = fb / fc, p = s * (2 * m * q * (q - r) - (b - a) * (r - 1)), q = (q - 1) * (r - 1) * (s - 1)), p > 0 ? q = -q : p = -p, s = e, e = d, 2 * p < 3 * m * q - Math.abs(del * q) && p < Math.abs(.5 * s * q) ? d = p / q : (d = m, e = d)), a = b, fa = fb, Math.abs(d) > del ? b += d : m > 0 ? b += del : b -= del, fb = ag_horner1(pars.p, pars.deg, b), fb * (fc / Math.abs(fc)) > 0 && (label1 = !0)
        }
        return b
    }

    function ag_zeroin(a, b, tol, pars) {
        var fa, fb;
        return fa = ag_horner1(pars.p, pars.deg, a), Math.abs(fa) < 1.192092896e-7 ? a : (fb = ag_horner1(pars.p, pars.deg, b), Math.abs(fb) < 1.192092896e-7 ? b : ag_zeroin2(a, b, fa, fb, tol, pars))
    }

    function polyZeroes(Poly, deg, a, a_closed, b, b_closed, Roots) {
        var i, left_ok, right_ok, nr, ndr, skip, e, f, s, pe, ps, tol, p, d, dr, p_x = new Array(22),
            d_x = new Array(22),
            dr_x = new Array(22),
            ply = {
                p: [],
                deg: 0
            };
        for (e = pe = 0, f = 0, i = 0; deg + 1 > i; ++i) f += Math.abs(Poly[i]);
        if (tol = (Math.abs(a) + Math.abs(b)) * (deg + 1) * 1.192092896e-7, tol >= f) return -1;
        for (p = p_x, d = d_x, dr = dr_x, i = 0; deg + 1 > i; ++i) p[i] = 1 / f * Poly[i];
        for (; Math.abs(p[deg]) < tol;) deg--;
        if (nr = 0, 0 == deg) return nr;
        if (1 == deg) return Roots[0] = -p[0] / p[1], left_ok = a_closed ? a < Roots[0] + tol : a < Roots[0] - tol, right_ok = b_closed ? b > Roots[0] - tol : b > Roots[0] + tol, nr = left_ok && right_ok ? 1 : 0, nr && (a_closed && Roots[0] < a ? Roots[0] = a : b_closed && Roots[0] > b && (Roots[0] = b)), nr;
        for (ply.p = p, ply.deg = deg, i = 1; deg >= i; i++) d[i - 1] = i * p[i];
        if (ndr = polyZeroes(d, deg - 1, a, 0, b, 0, dr), 0 == ndr.length) return 0;
        for (i = skip = 0; ndr >= i; i++) {
            if (nr > deg) return nr;
            0 == i ? (s = a, ps = ag_horner1(p, deg, s), Math.abs(ps) <= tol && a_closed && (Roots[nr++] = a)) : (s = e, ps = pe), i == ndr ? (e = b, skip = 0) : e = dr[i], pe = ag_horner1(p, deg, e), skip ? skip = 0 : Math.abs(pe) < tol ? (i != ndr || b_closed) && (Roots[nr++] = e, skip = 1) : (0 > ps && pe > 0 || ps > 0 && 0 > pe) && (Roots[nr++] = ag_zeroin(s, e, 0, ply), nr > 1 && Roots[nr - 2] >= Roots[nr - 1] - tol && (Roots[nr - 2] = .5 * (Roots[nr - 2] + Roots[nr - 1]), nr--))
        }
        return nr
    }

    function Tw2MayaScalarCurve() {
        this.index = -1, this.animationEngine = null, this.name = "", this.value = 0, this.length = 0
    }

    function Tw2MayaVector3Curve() {
        this.xIndex = -1, this.yIndex = -1, this.zIndex = -1, this.animationEngine = null, this.name = "", this.value = vec3.create()
    }

    function Tw2MayaEulerRotationCurve() {
        this.xIndex = -1, this.yIndex = -1, this.zIndex = -1, this.animationEngine = null, this.name = "", this.eulerValue = vec3.create(), this.updateQuaternion = !1, this.quatValue = quat4.create()
    }

    function Tw2QuaternionKey() {
        this.time = 0, this.value = quat4.create(), this.leftTangent = quat4.create(), this.rightTangent = quat4.create(), this.interpolation = 1
    }

    function Tw2QuaternionCurve() {
        this.name = "", this.length = 0, this.cycle = !1, this.reversed = !1, this.timeOffset = 0, this.timeScale = 1, this.startValue = quat4.create(), this.currentValue = quat4.create(), this.endValue = quat4.create(), this.startTangent = quat4.create(), this.endTangent = quat4.create(), this.interpolation = 1, this.keys = []
    }

    function Tw2WbgTrack() {
        function SetCurves(self) {
            if (self.name && self.group && self.geometryRes)
                for (var i = 0; i < self.geometryRes.animations.length; ++i)
                    for (var animation = self.geometryRes.animations[i], j = 0; j < animation.trackGroups.length; ++j) animation.trackGroups[j].name == self.group && self._ApplyTracks(animation.trackGroups[j], animation.duration)
        }

        this.name = "", this.geometryResPath = "", this.geometryRes = null, this.group = "", this.duration = 0, this.cycle = !1, this.Initialize = function () {
            if (this.geometryResPath) {
                this.geometryRes = resMan.GetResource(this.geometryResPath);
                var self = this,
                    notification = {
                        ReleaseCachedData: function () {
                        },
                        RebuildCachedData: function () {
                            SetCurves(self)
                        }
                    };
                this.geometryRes.RegisterNotification(notification)
            }
        }, this.UpdateValue = function (t) {
            this._TracksReady() && (this.cycle && (t %= this.duration), t <= this.duration && t >= 0 && this._UpdateValue(t))
        }
    }

    function Tw2WbgTransformTrack() {
        this.translation = vec3.create(), this.rotation = quat4.create(), this.rotation[3] = 1, this.scale = vec3.create();
        var positionCurve = null,
            rotationCurve = null,
            scaleCurve = null;
        this._TracksReady = function () {
            return positionCurve || rotationCurve || scaleCurve
        }, this._ApplyTracks = function (trackGroup, duration) {
            for (var i = 0; i < trackGroup.transformTracks.length; ++i) {
                var track = trackGroup.transformTracks[i];
                track.name == this.name && (this.duration = duration, positionCurve = track.position, rotationCurve = track.orientation, scaleCurve = track.scaleShear)
            }
            this.UpdateValue(0)
        };
        var scaleShear = mat4.identity(mat4.create());
        this._UpdateValue = function (t) {
            positionCurve && Tw2AnimationController.EvaluateCurve(positionCurve, t, this.translation, this.cycle, this.duration), rotationCurve && (Tw2AnimationController.EvaluateCurve(rotationCurve, t, this.rotation, this.cycle, this.duration), quat4.normalize(this.rotation)), scaleCurve && Tw2AnimationController.EvaluateCurve(scaleCurve, t, scaleShear, this.cycle, this.duration), this.scale[0] = scaleShear[0], this.scale[1] = scaleShear[5], this.scale[2] = scaleShear[10]
        }
    }

    function EveLocator() {
        this.name = "", this.transform = mat4.create()
    }

    function EveBoosterSet() {
        this.display = !0, this.effect = null, this.glows = null, this.glowScale = 1, this.glowColor = [0, 0, 0, 0], this.symHaloScale = 1, this.haloScaleX = 1, this.haloScaleY = 1, this.maxVel = 250, this.haloColor = [0, 0, 0, 0], this.alwaysOn = !0, this._parentTransform = mat4.create(), this._wavePhase = [], this._boosterTransforms = [], this._positions = device.gl.createBuffer(), this._decl = new Tw2VertexDeclaration, this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_POSITION, 0, device.gl.FLOAT, 3, 0)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 0, device.gl.FLOAT, 2, 12)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 1, device.gl.FLOAT, 4, 20)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 2, device.gl.FLOAT, 4, 36)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 3, device.gl.FLOAT, 4, 52)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 4, device.gl.FLOAT, 4, 68)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 5, device.gl.FLOAT, 4, 84)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 6, device.gl.FLOAT, 1, 100)), this._decl.RebuildHash(), this._perObjectData = new Tw2PerObjectData, this._perObjectData.perObjectVSData = new Tw2RawData, this._perObjectData.perObjectVSData.Declare("WorldMat", 16), this._perObjectData.perObjectVSData.Declare("Shipdata", 4), this._perObjectData.perObjectVSData.Create(), this.rebuildPending = !1
    }

    function EveBoosterBatch() {
        this.renderMode = device.RM_ANY, this.perObjectData = null, this.boosters = null
    }

    function EveSpriteSet() {
        this.name = "", this.sprites = [], this.effect = null, this._time = 0, this._vertexBuffer = null, this._indexBuffer = null, this._decl = new Tw2VertexDeclaration, this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 5, device.gl.FLOAT, 2, 0)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_POSITION, 0, device.gl.FLOAT, 3, 8)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_COLOR, 0, device.gl.FLOAT, 3, 20)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 0, device.gl.FLOAT, 1, 32)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 1, device.gl.FLOAT, 1, 36)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 2, device.gl.FLOAT, 1, 40)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 3, device.gl.FLOAT, 1, 44)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 4, device.gl.FLOAT, 1, 48)), this._decl.RebuildHash()
    }

    function EveSpriteSetBatch() {
        this._super.constructor.call(this), this.spriteSet = null
    }

    function EveSpriteSetItem() {
        this.name = "", this.position = vec3.create([0, 0, 0]), this.blinkRate = 0, this.blinkPhase = 0, this.minScale = 1, this.maxScale = 1, this.falloff = 0, this.color = vec3.create([0, 0, 0]), this.boneIndex = 0
    }

    function EveSpotlightSetItem() {
        this.name = "", this.transform = mat4.create(), this.coneColor = quat4.create(), this.spriteColor = quat4.create(), this.flareColor = quat4.create(), this.spriteScale = vec3.create(), this.boosterGainInfluence = !1, this.boneIndex = 0
    }

    function EveSpotlightSet() {
        this.name = "", this.display = !0, this.coneEffect = null, this.glowEffect = null, this.spotlightItems = [], this._coneVertexBuffer = null, this._spriteVertexBuffer = null, this._indexBuffer = null, this._decl = new Tw2VertexDeclaration, this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_COLOR, 0, device.gl.FLOAT, 4, 0)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 0, device.gl.FLOAT, 4, 16)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 1, device.gl.FLOAT, 4, 32)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 2, device.gl.FLOAT, 4, 48)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 3, device.gl.FLOAT, 3, 64)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 4, device.gl.FLOAT, 3, 76)), this._decl.RebuildHash()
    }

    function EveSpotlightSetBatch() {
        this._super.constructor.call(this), this.spotlightSet = null
    }

    function EvePlaneSet() {
        this.name = "", this.planes = [], this.effect = null, this.display = !0, this.hideOnLowQuality = !1, this._time = 0, this._vertexBuffer = null, this._indexBuffer = null, this._decl = new Tw2VertexDeclaration, this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 0, device.gl.FLOAT, 4, 0)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 1, device.gl.FLOAT, 4, 16)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 2, device.gl.FLOAT, 4, 32)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_COLOR, 0, device.gl.FLOAT, 4, 48)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 3, device.gl.FLOAT, 4, 64)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 4, device.gl.FLOAT, 4, 80)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 5, device.gl.FLOAT, 4, 96)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 6, device.gl.FLOAT, 4, 112)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 7, device.gl.FLOAT, 4, 128)), this._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 8, device.gl.FLOAT, 2, 144)), this._decl.RebuildHash()
    }

    function EvePlaneSetBatch() {
        this._super.constructor.call(this), this.planeSet = null
    }

    function EvePlaneSetItem() {
        this.name = "", this.position = vec3.create([0, 0, 0]), this.scaling = vec3.create([1, 1, 1]), this.rotation = quat4.create([0, 0, 0, 1]), this.color = quat4.create([1, 1, 1, 1]), this.layer1Transform = quat4.create([1, 1, 0, 0]), this.layer2Transform = quat4.create([1, 1, 0, 0]), this.layer1Scroll = quat4.create([0, 0, 0, 0]), this.layer2Scroll = quat4.create([0, 0, 0, 0]), this.boneIndex = 0
    }

    function EveBasicPerObjectData() {
    }

    function EveTransform() {
        this.NONE = 0, this.BILLBOARD = 1, this.TRANSLATE_WITH_CAMERA = 2, this.LOOK_AT_CAMERA = 3, this.SIMPLE_HALO = 4, this.EVE_CAMERA_ROTATION_ALIGNED = 100, this.EVE_BOOSTER = 101, this.EVE_SIMPLE_HALO = 102, this.EVE_CAMERA_ROTATION = 103, this.name = "", this.display = !0, this.useDistanceBasedScale = !1, this.modifier = this.NONE, this.scaling = vec3.create([1, 1, 1]), this.translation = vec3.create([0, 0, 0]), this.rotation = [0, 0, 0, 1], this.localTransform = mat4.create(), this.rotationTransform = mat4.create(), mat4.identity(this.localTransform), this.worldTransform = mat4.create(), mat4.identity(this.worldTransform), this.sortValueMultiplier = 1, this.distanceBasedScaleArg1 = .2, this.distanceBasedScaleArg2 = .63, this.particleSystems = [], this.particleEmitters = [], this.curveSets = [], this._perObjectData = new EveBasicPerObjectData, this._perObjectData.perObjectFFEData = new Tw2RawData, this._perObjectData.perObjectFFEData.Declare("World", 16), this._perObjectData.perObjectFFEData.Declare("WorldInverseTranspose", 16), this._perObjectData.perObjectFFEData.Create(), this.children = [], this.mesh = null, this._mat4Cache = [mat4.create(), mat4.create()], this._vec3Cache = [];
        for (var i = 0; 7 > i; ++i) this._vec3Cache[i] = vec3.create()
    }

    function EveTurretData() {
        this.visible = !0, this.localTransform = mat4.create(), this.worldTransform = mat4.create()
    }

    function EveTurretSet() {
        this.name = "", this.boundingSphere = [0, 0, 0, 0], this.bottomClipHeight = 0, this.locatorName = "", this.turretEffect = null, this.geometryResPath = "", this.sysBoneHeight = 0, this.firingEffectResPath = "", this.hasCyclingFiringPos = !1, this.firingEffect = null, this.display = !0, this.geometryResource = null, this.activeAnimation = new Tw2AnimationController, this.inactiveAnimation = new Tw2AnimationController, this.turrets = [], this.STATE_INACTIVE = 0, this.STATE_IDLE = 1, this.STATE_FIRING = 2, this.STATE_PACKING = 3, this.STATE_UNPACKING = 4, this.state = this.STATE_IDLE, this.targetPosition = vec3.create(), this._perObjectDataActive = new Tw2PerObjectData, this._perObjectDataActive.perObjectVSData = new Tw2RawData, this._perObjectDataActive.perObjectVSData.Declare("clipData", 4), this._perObjectDataActive.perObjectVSData.Declare("shipMatrix", 16), this._perObjectDataActive.perObjectVSData.Declare("turretData0", 4), this._perObjectDataActive.perObjectVSData.Declare("turretData1", 4), this._perObjectDataActive.perObjectVSData.Declare("turretData2", 4), this._perObjectDataActive.perObjectVSData.Declare("turretWorld0", 16), this._perObjectDataActive.perObjectVSData.Declare("turretWorld1", 16), this._perObjectDataActive.perObjectVSData.Declare("turretWorld2", 16), this._perObjectDataActive.perObjectVSData.Declare("turretPose0", 180), this._perObjectDataActive.perObjectVSData.Declare("turretPose1", 180), this._perObjectDataActive.perObjectVSData.Declare("turretPose2", 180), this._perObjectDataActive.perObjectVSData.Create(), this._perObjectDataInactive = new Tw2PerObjectData, this._perObjectDataInactive.perObjectVSData = new Tw2RawData, this._perObjectDataInactive.perObjectVSData.Declare("clipData", 4), this._perObjectDataInactive.perObjectVSData.Declare("shipMatrix", 16), this._perObjectDataInactive.perObjectVSData.Declare("turretData0", 4), this._perObjectDataInactive.perObjectVSData.Declare("turretData1", 4), this._perObjectDataInactive.perObjectVSData.Declare("turretData2", 4), this._perObjectDataInactive.perObjectVSData.Declare("turretWorld0", 16), this._perObjectDataInactive.perObjectVSData.Declare("turretWorld1", 16), this._perObjectDataInactive.perObjectVSData.Declare("turretWorld2", 16), this._perObjectDataInactive.perObjectVSData.Declare("turretPose0", 180), this._perObjectDataInactive.perObjectVSData.Declare("turretPose1", 180), this._perObjectDataInactive.perObjectVSData.Declare("turretPose2", 180), this._perObjectDataInactive.perObjectVSData.Create(), this.worldNames = ["turretWorld0", "turretWorld1", "turretWorld2"], this._activeTurret = -1, this._recheckTimeLeft = 0, this._currentCyclingFiresPos = 0
    }

    function EveSpaceObject() {
        this.name = "", this.mesh = null, this.spriteSets = [], this.boundingSphereCenter = vec3.create(), this.boundingSphereRadius = 0, this.locators = [], this.turretSets = [], this.decals = [], this.spotlightSets = [], this.planeSets = [], this.curveSets = [], this.transform = mat4.create(), mat4.identity(this.transform), this.children = [], this._perObjectData = new Tw2PerObjectData, this._perObjectData.perObjectVSData = new Tw2RawData, this._perObjectData.perObjectVSData.Declare("WorldMat", 16), this._perObjectData.perObjectVSData.Declare("Shipdata", 4), this._perObjectData.perObjectVSData.Declare("Clipdata1", 4), this._perObjectData.perObjectVSData.Declare("JointMat", 196), this._perObjectData.perObjectVSData.Create(), this._perObjectData.perObjectPSData = new Tw2RawData, this._perObjectData.perObjectPSData.Declare("Shipdata", 4), this._perObjectData.perObjectPSData.Declare("Clipdata1", 4), this._perObjectData.perObjectPSData.Declare("Clipdata2", 4), this._perObjectData.perObjectPSData.Declare("ShLighting", 28), this._perObjectData.perObjectPSData.Declare("customMaskMatrix", 16), this._perObjectData.perObjectPSData.Create(), this._perObjectData.perObjectVSData.Get("Shipdata")[1] = 1, this._perObjectData.perObjectPSData.Get("Shipdata")[1] = 1, this._perObjectData.perObjectVSData.Get("Shipdata")[3] = 1, this._perObjectData.perObjectPSData.Get("Shipdata")[3] = 1, this.animation = new Tw2AnimationController, this.lod = 3, this._tempVec = vec3.create()
    }

    function EveShip() {
        this._super.constructor.call(this), this.boosterGain = 1, this.boosters = null, this.turretSets = [], this._turretSetsLocatorInfo = []
    }

    function EveTurretSetLocatorInfo() {
        this.isJoint = !1, this.locatorTransforms = []
    }

    function EveSpaceObjectDecal() {
        this.display = !0, this.decalEffect = null, this.name = "", this.position = vec3.create(), this.rotation = quat4.create(), this.scaling = vec3.create(), this.decalMatrix = mat4.create(), this.invDecalMatrix = mat4.create(), this.parentGeometry = null, this.indexBuffer = [], this._indexBuffer = null, this.parentBoneIndex = -1, this._perObjectData = new Tw2PerObjectData, this._perObjectData.perObjectVSData = new Tw2RawData, this._perObjectData.perObjectVSData.Declare("worldMatrix", 16), this._perObjectData.perObjectVSData.Declare("invWorldMatrix", 16), this._perObjectData.perObjectVSData.Declare("decalMatrix", 16), this._perObjectData.perObjectVSData.Declare("invDecalMatrix", 16), this._perObjectData.perObjectVSData.Declare("parentBoneMatrix", 16), this._perObjectData.perObjectVSData.Create(), mat4.identity(this._perObjectData.perObjectVSData.Get("parentBoneMatrix")), variableStore.RegisterType("u_DecalMatrix", Tw2MatrixParameter), variableStore.RegisterType("u_InvDecalMatrix", Tw2MatrixParameter)
    }

    function EveSpaceScene() {
        this.lensflares = [], this.objects = [], this.planets = [], this.backgroundEffect = null, this.envMapResPath = "", this.envMap1ResPath = "", this.envMap2ResPath = "", this.envMap3ResPath = "", this.fogStart = 0, this.fogEnd = 0, this.fogMax = 0, this.fogType = 0, this.fogBlur = 0, this.nebulaIntensity = 1, this.sunDirection = vec3.create([1, -1, 1]), this.sunDiffuseColor = quat4.create([1, 1, 1, 1]), this.ambientColor = quat4.create([.25, .25, .25, 1]), this.fogColor = quat4.create([.25, .25, .25, 1]), this.envMapScaling = vec3.create([1, 1, 1]), this.envMapRotation = quat4.create([0, 0, 0, 1]), this.renderDebugInfo = !1, this.backgroundRenderingEnabled = !0, this.envMapRes = null, this.envMap1Res = null, this.envMap2Res = null, this.envMap3Res = null, this._envMapHandle = variableStore.RegisterVariable("EveSpaceSceneEnvMap", ""), this._envMap1Handle = variableStore.RegisterVariable("EnvMap1", ""), this._envMap2Handle = variableStore.RegisterVariable("EnvMap2", ""), this._envMap3Handle = variableStore.RegisterVariable("EnvMap3", ""), this._debugHelper = null, this._batches = new Tw2BatchAccumulator, this._perFrameVS = new Tw2RawData, this._perFrameVS.Declare("ViewInverseTransposeMat", 16), this._perFrameVS.Declare("ViewProjectionMat", 16), this._perFrameVS.Declare("ViewMat", 16), this._perFrameVS.Declare("ProjectionMat", 16), this._perFrameVS.Declare("ShadowViewMat", 16), this._perFrameVS.Declare("ShadowViewProjectionMat", 16), this._perFrameVS.Declare("EnvMapRotationMat", 16), this._perFrameVS.Declare("SunData.DirWorld", 4), this._perFrameVS.Declare("SunData.DiffuseColor", 4), this._perFrameVS.Declare("FogFactors", 4), this._perFrameVS.Declare("TargetResolution", 4), this._perFrameVS.Declare("ViewportAdjustment", 4), this._perFrameVS.Declare("MiscSettings", 4), this._perFrameVS.Create(), this._perFramePS = new Tw2RawData, this._perFramePS.Declare("ViewInverseTransposeMat", 16), this._perFramePS.Declare("ViewMat", 16), this._perFramePS.Declare("EnvMapRotationMat", 16), this._perFramePS.Declare("SunData.DirWorld", 4), this._perFramePS.Declare("SunData.DiffuseColor", 4), this._perFramePS.Declare("SceneData.AmbientColor", 3), this._perFramePS.Declare("SceneData.NebulaIntensity", 1), this._perFramePS.Declare("SceneData.FogColor", 4), this._perFramePS.Declare("ShadowCameraRange", 4), this._perFramePS.Declare("TargetResolution", 4), this._perFramePS.Declare("ShadowMapSettings", 4), this._perFramePS.Declare("MiscSettings", 4), this._perFramePS.Declare("MiscSettings2", 4), this._perFramePS.Create(), this.lodEnabled = !1, variableStore.RegisterVariable("ShadowLightness", 0)
    }

    function EveOccluder() {
        if (this.name = "", this.display = !0, this.value = 1, this.sprites = [], variableStore.RegisterType("OccluderValue", Tw2Vector4Parameter), !EveOccluder._collectEffect) {
            EveOccluder._collectEffect = new Tw2Effect, EveOccluder._collectEffect.effectFilePath = "res:/graphics/effect/managed/space/specialfx/lensflares/collectsamples.fx";
            var param = new Tw2TextureParameter;
            param.name = "BackBuffer", EveOccluder._collectEffect.parameters[param.name] = param;
            var param = new Tw2Vector4Parameter;
            param.name = "OccluderPosition", EveOccluder._collectEffect.parameters[param.name] = param;
            var param = new Tw2Vector3Parameter;
            param.name = "OccluderIndex", EveOccluder._collectEffect.parameters[param.name] = param, EveOccluder._collectEffect.Initialize(), EveOccluder._vertexBuffer = null, EveOccluder._decl = new Tw2VertexDeclaration, EveOccluder._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_POSITION, 0, device.gl.FLOAT, 2, 0)), EveOccluder._decl.elements.push(new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 0, device.gl.FLOAT, 2, 8)), EveOccluder._decl.RebuildHash();
            for (var vb = new Float32Array(6120), index = 0, i = 0; 16 > i; ++i)
                for (var j = 0; 16 > j; ++j) {
                    var x = (i + Math.random()) / 16 * 2 - 1,
                        y = (j + Math.random()) / 16 * 2 - 1;
                    vb[index++] = 1, vb[index++] = 1, vb[index++] = x, vb[index++] = y, vb[index++] = -1, vb[index++] = 1, vb[index++] = x, vb[index++] = y, vb[index++] = 1, vb[index++] = -1, vb[index++] = x, vb[index++] = y, vb[index++] = -1, vb[index++] = 1, vb[index++] = x, vb[index++] = y, vb[index++] = 1, vb[index++] = -1, vb[index++] = x, vb[index++] = y, vb[index++] = -1, vb[index++] = -1, vb[index++] = x, vb[index++] = y
                }
            EveOccluder._vertexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, EveOccluder._vertexBuffer), device.gl.bufferData(device.gl.ARRAY_BUFFER, vb, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, null)
        }
    }

    function EveLensflare() {
        this.name = "", this.display = !0, this.update = !0, this.doOcclusionQueries = !0, this.cameraFactor = 20, this.position = vec3.create(), this.flares = [], this.occluders = [], this.backgroundOccluders = [], this.occlusionIntensity = 1, this.backgroundOcclusionIntensity = 1, this.distanceToEdgeCurves = [], this.distanceToCenterCurves = [], this.radialAngleCurves = [], this.xDistanceToCenter = [], this.yDistanceToCenter = [], this.bindings = [], this.curveSets = [], this.mesh = null, this._directionVar = variableStore.RegisterVariable("LensflareFxDirectionScale", quat4.create()), this._occlusionVar = variableStore.RegisterVariable("LensflareFxOccScale", quat4.create([1, 1, 0, 0])), this._direction = vec3.create(), this._transform = mat4.create(), EveLensflare.backBuffer || (EveLensflare.backBuffer = new Tw2TextureRes, EveLensflare.backBuffer.width = 0, EveLensflare.backBuffer.height = 0, EveLensflare.backBuffer.hasMipMaps = !1, EveLensflare.occluderLevels = [new Tw2RenderTarget, new Tw2RenderTarget, new Tw2RenderTarget, new Tw2RenderTarget], EveLensflare.occludedLevelIndex = 0)
    }

    function EvePlanet() {
        this.highDetail = new EveTransform, this.effectHeight = new Tw2Effect, this.itemID = 0, this.heightMapResPath1 = "", this.heightMapResPath2 = "", this.heightMap = new Tw2RenderTarget, this.hightDirty = !1, this.lockedResources = []
    }

    function EveEffectRoot() {
        this.name = "", this.display = !0, this.highDetail = null, this.isPlaying = !1, this.scaling = vec3.create([1, 1, 1]), this.rotation = quat4.create([0, 0, 0, 1]), this.translation = vec3.create(), this.localTransform = mat4.identity(mat4.create()), this.rotationTransform = mat4.create(), this.boundingSphereCenter = vec3.create(), this.boundingSphereRadius = 0, this.duration = 0, this._perObjectData = new Tw2PerObjectData, this._perObjectData.perObjectVSData = new Tw2RawData, this._perObjectData.perObjectVSData.Declare("WorldMat", 16), this._perObjectData.perObjectVSData.Declare("Shipdata", 4), this._perObjectData.perObjectVSData.Declare("JointMat", 196), this._perObjectData.perObjectVSData.Create(), this._perObjectData.perObjectPSData = new Tw2RawData, this._perObjectData.perObjectPSData.Declare("Shipdata", 4), this._perObjectData.perObjectPSData.Create()
    }

    function EveStretch() {
        this.name = "", this.display = !0, this.update = !0, this.source = null, this.dest = null, this.sourceObject = null, this.destObject = null, this.stretchObject = null, this.curveSets = [], this.length = new Tw2Float, this._time = 0, this._useTransformsForStretch = !1, this._sourcePosition = vec3.create(), this._destinationPosition = vec3.create(), this._displaySourceObject = !0, this._sourceTransform = null, this._displayDestObject = !0, this._useTransformsForStretch = !1, this._isNegZForward = !1
    }

    function EvePerMuzzleData() {
        this.started = !1, this.readyToStart = !1, this.muzzlePositionBone = null, this.muzzleTransform = mat4.create(), this.muzzlePosition = this.muzzleTransform.subarray(12, 15), this.currentStartDelay = 0, this.constantDelay = 0, this.elapsedTime = 0
    }

    function EveTurretFiringFX() {
        this.name = "", this.display = !0, this.useMuzzleTransform = !1, this.isFiring = !1, this.isLoopFiring = !1, this.firingDelay1 = 0, this.firingDelay2 = 0, this.firingDelay3 = 0, this.firingDelay4 = 0, this.firingDelay5 = 0, this.firingDelay6 = 0, this.firingDelay7 = 0, this.firingDelay8 = 0, this.stretch = [], this.endPosition = vec3.create(), this._firingDuration = 0, this._perMuzzleData = []
    }

    function EveSOF() {
        function _get(obj, property, defaultValue) {
            return property in obj ? obj[property] : defaultValue
        }

        function GetFactionMeshAreaParameters(areaName, paramName, faction) {
            var areas = _get(faction, "areas", {});
            if (areaName in areas) {
                var area = _get(areas, areaName, {});
                if (paramName in _get(area, "parameters", {})) return _get(area.parameters[paramName], "value", [0, 0, 0, 0])
            }
        }

        function GetShaderPrefix(isAnimated) {
            return isAnimated ? _get(data.generic, "shaderPrefixAnimated", "") : _get(data.generic, "shaderPrefix", "")
        }

        function ModifyTextureResPath(path, name, hull, faction) {
            if (!_get(faction, "resPathInsert", "").length) return path;
            if ("PgrMap" == name || "PgsMap" == name || "SpecularMap" == name || "MaskMap" == name || "SubMaskMap" == name) {
                var index = path.lastIndexOf("/"),
                    pathCopy = path;
                if (index >= 0 && (pathCopy = path.substr(0, index + 1) + faction.resPathInsert + "/" + path.substr(index + 1)), index = pathCopy.lastIndexOf("_"), index >= 0) {
                    pathCopy = pathCopy.substr(0, index) + "_" + faction.resPathInsert + pathCopy.substr(index);
                    var textureOverrides = _get(hull, "textureOverrides", {});
                    if (name in textureOverrides && faction.name in textureOverrides[name]) return pathCopy
                }
            }
            return path
        }

        function ModifyShaderPath(shader, isSkinned) {
            var prefix = GetShaderPrefix(isSkinned);
            shader = "/" + shader;
            var index = shader.lastIndexOf("/");
            return shader.substr(0, index + 1) + prefix + shader.substr(index + 1)
        }

        function FillMeshAreas(areas, areasName, hull, faction) {
            for (var hullAreas = _get(hull, areasName, []), i = 0; i < hullAreas.length; ++i) {
                var area = hullAreas[i],
                    effect = new Tw2Effect;
                effect.effectFilePath = data.generic.areaShaderLocation + ModifyShaderPath(area.shader, hull.isSkinned);
                for (var hullParameters = _get(area, "parameters", []), j = 0; j < hullParameters.length; ++j) {
                    var hullParameter = hullParameters[j],
                        value = GetFactionMeshAreaParameters(area.name, hullParameter.name, faction);
                    value || (value = _get(hullParameter, "value", [0, 0, 0, 0])), effect.parameters[hullParameter.name] = new Tw2Vector4Parameter(hullParameter.name, value)
                }
                var hullTextures = _get(area, "textures", []);
                for (j = 0; j < hullTextures.length; ++j) {
                    var hullTexture = hullTextures[j],
                        path = _get(hullTexture, "resFilePath", "");
                    path = ModifyTextureResPath(path, hullTexture.name, hull, faction), effect.parameters[hullTexture.name] = new Tw2TextureParameter(hullTexture.name, path)
                }
                effect.Initialize();
                var newArea = new Tw2MeshArea;
                newArea.name = area.name, newArea.effect = effect, newArea.index = _get(area, "index", 0), newArea.count = _get(area, "count", 1), areas.push(newArea)
            }
        }

        function SetupMesh(ship, hull, faction) {
            var mesh = new Tw2Mesh;
            mesh.geometryResPath = hull.geometryResFilePath, ship.boundingSphereCenter[0] = hull.boundingSphere[0], ship.boundingSphereCenter[1] = hull.boundingSphere[1], ship.boundingSphereCenter[2] = hull.boundingSphere[2], ship.boundingSphereRadius = hull.boundingSphere[3], FillMeshAreas(_get(mesh, "opaqueAreas", []), "opaqueAreas", hull, faction), FillMeshAreas(_get(mesh, "transparentAreas", []), "transparentAreas", hull, faction), FillMeshAreas(_get(mesh, "additiveAreas", []), "additiveAreas", hull, faction), FillMeshAreas(_get(mesh, "depthAreas", []), "depthAreas", hull, faction), mesh.Initialize(), ship.mesh = mesh
        }

        function SetupDecals(ship, hull, faction) {
            for (var hullDecals = _get(hull, "hullDecals", []), i = 0; i < hullDecals.length; ++i) {
                var hullDecal = hullDecals[i],
                    factionDecal = null,
                    factionIndex = "group" + _get(hullDecal, "groupIndex", -1);
                if (faction.decals && factionIndex in faction.decals && (factionDecal = faction.decals[factionIndex]), !factionDecal || factionDecal.isVisible) {
                    var effect = new Tw2Effect;
                    if (factionDecal && factionDecal.shader && factionDecal.shader.length) effect.effectFilePath = data.generic.decalShaderLocation + "/" + GetShaderPrefix(!1) + factionDecal.shader;
                    else {
                        if (!hullDecal.shader || !hullDecal.shader.length) continue;
                        effect.effectFilePath = data.generic.decalShaderLocation + "/" + GetShaderPrefix(!1) + hullDecal.shader
                    }
                    for (var hullParameters = _get(hullDecal, "parameters", []), j = 0; j < hullParameters.length; ++j) effect.parameters[hullParameters[j].name] = new Tw2Vector4Parameter(hullParameters[j].name, _get(hullParameters[j], "value", [0, 0, 0, 0]));
                    var hullTextures = _get(hullDecal, "textures", []);
                    for (j = 0; j < hullTextures.length; ++j) effect.parameters[hullTextures[j].name] = new Tw2TextureParameter(hullTextures[j].name, hullTextures[j].resFilePath);
                    if (factionDecal) {
                        var factionParameters = _get(factionDecal, "parameters", []);
                        for (j = 0; j < factionParameters.length; ++j) effect.parameters[factionParameters[j].name] = new Tw2Vector4Parameter(factionParameters[j].name, _get(factionParameters[j], "value", [0, 0, 0, 0]));
                        var factionTextures = _get(factionDecal, "textures", []);
                        for (j = 0; j < factionTextures.length; ++j) effect.parameters[factionTextures[j].name] = new Tw2TextureParameter(factionTextures[j].name, factionTextures[j].resFilePath)
                    }
                    effect.Initialize();
                    var decal = new EveSpaceObjectDecal;
                    vec3.set(_get(hullDecal, "position", [0, 0, 0]), decal.position), quat4.set(_get(hullDecal, "rotation", [0, 0, 0, 1]), decal.rotation), vec3.set(_get(hullDecal, "scaling", [1, 1, 1]), decal.scaling), decal.boneIndex = _get(hullDecal, "boneIndex", -1), decal.indexBuffer = new Uint16Array(hullDecal.indexBuffer), decal.decalEffect = effect, decal.Initialize(), ship.decals.push(decal)
                }
            }
        }

        function SetupSpriteSets(ship, hull, faction) {
            for (var hullSets = _get(hull, "spriteSets", []), factionSets = _get(faction, "spriteSets", {}), i = 0; i < hullSets.length; ++i) {
                var spriteSet = new EveSpriteSet;
                spriteSet.effect = hullSets[i].skinned ? spriteEffectSkinned : spriteEffect;
                for (var hullData = _get(hullSets[i], "items", []), j = 0; j < hullData.length; ++j)
                    if ("group" + _get(hullData[j], "groupIndex", -1) in factionSets) {
                        var factionSet = factionSets["group" + _get(hullData[j], "groupIndex", -1)],
                            item = new EveSpriteSetItem;
                        "color" in factionSet && (item.color = factionSet.color), item.blinkPhase = _get(hullData[j], "blinkPhase", 0), item.blinkRate = _get(hullData[j], "blinkRate", .1), item.boneIndex = _get(hullData[j], "boneIndex", 0), item.falloff = _get(hullData[j], "falloff", 0), item.maxScale = _get(hullData[j], "maxScale", 10), item.minScale = _get(hullData[j], "minScale", 1), "position" in hullData[j] && (item.position = hullData[j].position), spriteSet.sprites.push(item)
                    }
                spriteSet.Initialize(), ship.spriteSets.push(spriteSet)
            }
        }

        function _scale(a, b, c) {
            c[0] = a[0] * b, c[1] = a[1] * b, c[2] = a[2] * b, c[3] = a[3] * b
        }

        function SetupSpotlightSets(ship, hull, faction) {
            for (var hullSets = _get(hull, "spotlightSets", []), factionSets = _get(faction, "spotlightSets", {}), i = 0; i < hullSets.length; ++i) {
                var spotlightSet = new EveSpotlightSet;
                spotlightSet.coneEffect = new Tw2Effect, spotlightSet.glowEffect = new Tw2Effect, hullSets[i].skinned ? (spotlightSet.coneEffect.effectFilePath = "res:/graphics/effect/managed/space/spaceobject/fx/skinned_spotlightcone.fx", spotlightSet.glowEffect.effectFilePath = "res:/graphics/effect/managed/space/spaceobject/fx/skinned_spotlightglow.fx") : (spotlightSet.coneEffect.effectFilePath = "res:/graphics/effect/managed/space/spaceobject/fx/spotlightcone.fx", spotlightSet.glowEffect.effectFilePath = "res:/graphics/effect/managed/space/spaceobject/fx/spotlightglow.fx"), spotlightSet.coneEffect.parameters.TextureMap = new Tw2TextureParameter("TextureMap", hullSets[i].coneTextureResPath), spotlightSet.glowEffect.parameters.TextureMap = new Tw2TextureParameter("TextureMap", hullSets[i].glowTextureResPath), spotlightSet.coneEffect.parameters.zOffset = new Tw2FloatParameter("zOffset", _get(hullSets[i], "zOffset", 0)), spotlightSet.coneEffect.Initialize(), spotlightSet.glowEffect.Initialize();
                for (var hullData = _get(hullSets[i], "items", []), j = 0; j < hullData.length; ++j) {
                    var item = new EveSpotlightSetItem;
                    item.boneIndex = _get(hullData[j], "boneIndex", 0), item.boosterGainInfluence = _get(hullData[j], "boosterGainInfluence", 0);
                    var factionSet = factionSets["group" + _get(hullData[j], "groupIndex", -1)];
                    factionSet ? (_scale(_get(factionSet, "coneColor", [0, 0, 0, 0]), _get(hullData[j], "coneIntensity", 0), item.coneColor), _scale(_get(factionSet, "spriteColor", [0, 0, 0, 0]), _get(hullData[j], "spriteIntensity", 0), item.spriteColor), _scale(_get(factionSet, "flareColor", [0, 0, 0, 0]), _get(hullData[j], "flareIntensity", 0), item.flareColor)) : (quat4.set([1, 1, 1, 1], item.coneColor), quat4.set([1, 1, 1, 1], item.flareColor), quat4.set([1, 1, 1, 1], item.spriteColor)), item.spriteScale = _get(hullData[j], "spriteScale", [1, 1, 1]), "transform" in hullData[j] ? item.transform = hullData[j].transform : mat4.identity(item.transform), spotlightSet.spotlightItems.push(item)
                }
                spotlightSet.Initialize(), ship.spotlightSets.push(spotlightSet)
            }
        }

        function _assignIfExists(dest, src, attr) {
            attr in src && (dest[attr] = src[attr])
        }

        function SetupPlaneSets(ship, hull, faction) {
            for (var hullSets = _get(hull, "planeSets", []), factionSets = _get(faction, "planeSets", {}), i = 0; i < hullSets.length; ++i) {
                var planeSet = new EvePlaneSet;
                planeSet.effect = new Tw2Effect, planeSet.effect.effectFilePath = hullSets[i].skinned ? "res:/graphics/effect/managed/space/spaceobject/fx/skinned_planeglow.fx" : "res:/graphics/effect/managed/space/spaceobject/fx/planeglow.fx", planeSet.effect.parameters.Layer1Map = new Tw2TextureParameter("Layer1Map", hullSets[i].layer1MapResPath), planeSet.effect.parameters.Layer2Map = new Tw2TextureParameter("Layer2Map", hullSets[i].layer2MapResPath), planeSet.effect.parameters.MaskMap = new Tw2TextureParameter("MaskMap", hullSets[i].maskMapResPath), planeSet.effect.parameters.PlaneData = new Tw2Vector4Parameter("PlaneData", _get(hullSets[i], "planeData", [1, 0, 0, 0])), planeSet.effect.Initialize();
                for (var hullData = _get(hullSets[i], "items", []), j = 0; j < hullData.length; ++j) {
                    var item = new EvePlaneSetItem;
                    _assignIfExists(item, hullData[j], "position"), _assignIfExists(item, hullData[j], "rotation"), _assignIfExists(item, hullData[j], "scaling"), _assignIfExists(item, hullData[j], "color"), quat4.set(_get(hullData[j], "layer1Transform", [0, 0, 0, 0]), item.layer1Transform), _assignIfExists(item, hullData[j], "layer1Scroll"), quat4.set(_get(hullData[j], "layer2Transform", [0, 0, 0, 0]), item.layer2Transform), _assignIfExists(item, hullData[j], "layer2Scroll"), item.boneIndex = _get(hullData[j], "boneIndex", -1);
                    var factionSet = factionSets["group" + _get(hullData[j], "groupIndex", -1)];
                    factionSet && quat4.set(_get(factionSet, "color", [0, 0, 0, 0]), item.color), planeSet.planes.push(item)
                }
                planeSet.Initialize(), ship.planeSets.push(planeSet)
            }
        }

        function SetupBoosters(ship, hull, race) {
            if ("booster" in hull) {
                var booster = new EveBoosterSet,
                    hullBooster = hull.booster,
                    raceBooster = _get(race, "booster", {});
                _assignIfExists(booster, raceBooster, "glowScale"), _assignIfExists(booster, raceBooster, "glowColor"), _assignIfExists(booster, raceBooster, "symHaloScale"), _assignIfExists(booster, raceBooster, "haloScaleX"), _assignIfExists(booster, raceBooster, "haloScaleY"), _assignIfExists(booster, raceBooster, "haloColor"), booster.effect = new Tw2Effect, booster.effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/Booster/Booster.fx", booster.effect.parameters.Color = new Tw2Vector4Parameter("Color", _get(raceBooster, "color", [0, 0, 0, 0])), booster.effect.parameters.BoosterScale = new Tw2Vector4Parameter("BoosterScale", _get(raceBooster, "scale", [1, 1, 1, 1])), booster.effect.parameters.WaveMap = new Tw2TextureParameter("WaveMap", "res:/Texture/Sprite/waveHiFi.dds.0.png"), booster.effect.parameters.DiffuseMap = new Tw2TextureParameter("DiffuseMap", raceBooster.textureResPath), booster.effect.Initialize(), booster.glows = new EveSpriteSet, booster.glows.effect = new Tw2Effect, booster.glows.effect.effectFilePath = "res:/Graphics/Effect/Managed/Space/Booster/BoosterGlow.fx", booster.glows.effect.parameters.DiffuseMap = new Tw2TextureParameter("DiffuseMap", "res:/Texture/Particle/whitesharp.dds.0.png"), booster.glows.effect.Initialize();
                for (var items = _get(hullBooster, "items", []), i = 0; i < items.length; ++i) {
                    var locator = new EveLocator;
                    locator.name = "locator_booster_" + (i + 1), "transform" in items[i] ? locator.transform = items[i].transform : mat4.identity(locator.transform), ship.locators.push(locator)
                }
                booster.Initialize(), ship.boosters = booster
            }
        }

        function SetupLocators(ship, hull) {
            for (var hullLocators = _get(hull, "locatorTurrets", []), i = 0; i < hullLocators.length; ++i) {
                var locator = new EveLocator;
                locator.name = hullLocators[i].name, "transform" in hullLocators[i] ? locator.transform = hullLocators[i].transform : mat4.identity(locator.transform), ship.locators.push(locator)
            }
        }

        function BindParticleEmitters(obj, curveSet, curve) {
            for (var i = 0; i < obj.particleEmitters.length; ++i)
                if ("rate" in obj.particleEmitters[i]) {
                    var binding = new Tw2ValueBinding;
                    binding.sourceObject = curve, binding.sourceAttribute = "currentValue", binding.destinationObject = obj.particleEmitters[i], binding.destinationAttribute = "rate", binding.Initialize(), curveSet.bindings.push(binding)
                }
            for (i = 0; i < obj.children.length; ++i) BindParticleEmitters(obj.children[i], curveSet, curve)
        }

        function SetupChildren(ship, hull, curveSet, curves) {
            function onChildLoaded(child) {
                return function (obj) {
                    ship.children.push(obj), _assignIfExists(obj, child, "translation"), _assignIfExists(obj, child, "rotation"), _assignIfExists(obj, child, "scaling");
                    var id = _get(child, "id", -1);
                    -1 != id && curves[id] && BindParticleEmitters(obj, curveSet, curves[id])
                }
            }

            for (var children = _get(hull, "children", []), i = 0; i < children.length; ++i) resMan.GetObject(children[i].redFilePath, onChildLoaded(children[i]))
        }

        function SetupAnimations(ship, hull) {
            for (var id_curves = [], curveSet = null, animations = _get(hull, "animations", []), i = 0; i < animations.length; ++i)
                if (-1 != _get(animations[i], "id", -1) && -1 != _get(animations[i], "startRate", -1)) {
                    curveSet || (curveSet = new Tw2CurveSet);
                    var curve = new Tw2ScalarCurve2;
                    curve.keys.push(new Tw2ScalarKey2), curve.keys.push(new Tw2ScalarKey2), curve.keys[0].value = _get(animations[i], "startRate", -1), curve.keys[1].time = 1, curve.keys[1].value = _get(animations[i], "endRate", -1), curve.Initialize(), curveSet.curves.push(curve), ship.curveSets.push(curveSet), id_curves[_get(animations[i], "id", -1)] = curve
                }
            return curveSet && curveSet.Initialize(), [curveSet, id_curves]
        }

        function Build(dna) {
            var parts = dna.split(":"),
                ship = new EveShip,
                hull = data.hull[parts[0]],
                faction = data.faction[parts[1]],
                race = data.race[parts[2]];
            SetupMesh(ship, hull, faction), SetupDecals(ship, hull, faction), SetupSpriteSets(ship, hull, faction), SetupSpotlightSets(ship, hull, faction), SetupPlaneSets(ship, hull, faction), SetupBoosters(ship, hull, race), SetupLocators(ship, hull);
            var curves = SetupAnimations(ship, hull);
            return SetupChildren(ship, hull, curves[0], curves[1]), ship.Initialize(), ship
        }

        function GetTurretMaterialParameter(name, matUsageMain, matUsageMask, areaData) {
            var materialId = -1;
            return name.substr(0, materialPrefixes[0].length).toLowerCase() == materialPrefixes[0].toLowerCase() ? (materialId = matUsageMain, name = name.substr(materialPrefixes[0].length)) : name.substr(0, materialPrefixes[1].length).toLowerCase() == materialPrefixes[1].toLowerCase() && (materialId = matUsageMask, name = name.substr(materialPrefixes[1].length)), materialId >= 0 && 3 > materialId && (name = materialPrefixes[materialId] + name, name in areaData.parameters) ? areaData.parameters[name].value : void 0
        }

        function CombineTurretMaterial(name, parentValue, turretValue, overrideMethod) {
            switch (overrideMethod) {
                case "overridable":
                    return parentValue ? parentValue : turretValue ? turretValue : zeroColor;
                case "half_overridable":
                    return name.indexOf("GlowColor") >= 0 ? turretValue ? turretValue : zeroColor : parentValue ? parentValue : turretValue ? turretValue : zeroColor;
                case "not_overridable":
                case "half_overridable_2":
                    return turretValue ? turretValue : zeroColor
            }
            return zeroColor
        }

        function SetupTurretMaterial(turretSet, parentFactionName, turretFactionName) {
            var parentFaction = data.faction[parentFactionName],
                turretFaction = data.faction[turretFactionName],
                parentArea = null;
            parentFaction && parentFaction.areas && "hull" in parentFaction.areas && (parentArea = parentFaction.areas.hull);
            var turretArea = null;
            if (turretFaction && turretFaction.areas && "hull" in turretFaction.areas && (turretArea = turretFaction.areas.hull), (parentArea || turretArea) && turretSet.turretEffect) {
                var params = turretSet.turretEffect.parameters;
                for (var i in params)
                    if (params[i].constructor.prototype == Tw2Vector4Parameter.prototype) {
                        var parentValue = null,
                            turretValue = null;
                        parentArea && (parentValue = GetTurretMaterialParameter(i, _get(parentFaction, "materialUsageMain", 0), _get(parentFaction, "materialUsageMask", 1), parentArea)), turretArea && (turretValue = GetTurretMaterialParameter(i, _get(parentFaction, "materialUsageMain", 0), _get(parentFaction, "materialUsageMask", 1), parentArea)), quat4.set(CombineTurretMaterial(i, parentValue, turretValue, turretSet.turretEffect.name), params[i].value)
                    }
                turretSet.turretEffect.BindParameters()
            }
        }

        function getDataKeys(name) {

            var names = {};

// Jeremy Code Insert

            if (name !== "all") {
                for (var i in data[name]) names[i] = data[name][i].description || "";
                return names
            } else {
                names = data;
                return names
            }

// Jeremy Code Insert

        }

        var data = null,
            spriteEffectSkinned = null,
            spriteEffect = null,
            dataLoading = !1,
            pendingLoads = [];
        this.LoadData = function (callback) {
            null == data ? (callback && pendingLoads.push(callback), dataLoading || (spriteEffect = new Tw2Effect, spriteEffect.effectFilePath = "res:/graphics/effect/managed/space/spaceobject/fx/blinkinglights.fx", spriteEffect.parameters.MainIntensity = new Tw2FloatParameter("MainIntensity", 1), spriteEffect.parameters.GradientMap = new Tw2TextureParameter("GradientMap", "res:/texture/particle/whitesharp_gradient.dds.0.png"), spriteEffect.Initialize(), spriteEffectSkinned = new Tw2Effect, spriteEffectSkinned.effectFilePath = "res:/graphics/effect/managed/space/spaceobject/fx/skinned_blinkinglights.fx", spriteEffectSkinned.parameters.MainIntensity = new Tw2FloatParameter("MainIntensity", 1), spriteEffectSkinned.parameters.GradientMap = new Tw2TextureParameter("GradientMap", "res:/texture/particle/whitesharp_gradient.dds.0.png"), spriteEffectSkinned.Initialize(), resMan.GetObject("res:/dx9/model/spaceobjectfactory/data.red", function (obj) {
                data = obj;
                for (var i = 0; i < pendingLoads.length; ++i) pendingLoads[i]();
                pendingLoads = []
            }), dataLoading = !0)) : callback && callback()
        }, this.BuildFromDNA = function (dna, callback) {
            if (null == data) this.LoadData(function () {
                var result = Build(dna);
                callback && callback(result)
            });
            else {
                var result = Build(dna);
                callback && callback(result)
            }
        };
        var materialPrefixes = ["Material", "Mask", "SubMask"],
            zeroColor = [0, 0, 0, 0];
        this.SetupTurretMaterial = function (turretSet, parentFactionName, turretFactionName, callback) {
            null == data ? this.LoadData(function () {
                SetupTurretMaterial(turretSet, parentFactionName, turretFactionName), callback && callback()
            }) : (SetupTurretMaterial(turretSet, parentFactionName, turretFactionName), callback && callback())
        }, this.GetHullNames = function (callback) {
            this.LoadData(function () {
                callback(getDataKeys("hull"))
            })
        }, this.GetFactionNames = function (callback) {
            this.LoadData(function () {
                callback(getDataKeys("faction"))
            })
        }, this.GetRaceNames = function (callback) {
            this.LoadData(function () {
                callback(getDataKeys("race"))
            })

// Jeremy Code Insert

        },
            this.GetSofData = function (callback) {
                this.LoadData(function () {
                    callback(getDataKeys("all"))
                })
            };

// Jeremy Code Insert


    }

    function Tw2ParticleElementDeclaration() {
        this.elementType = 4, this.customName = "", this.dimension = 1, this.usageIndex = 0, this.usedByGPU = !0
    }

    function Tr2ParticleElement(decl) {
        this.elementType = decl.elementType, this.customName = decl.customName, this.dimension = decl.GetDimension(), this.usageIndex = decl.usageIndex, this.usedByGPU = decl.usedByGPU, this.buffer = null, this.startOffset = 0, this.offset = 0, this.instanceStride = 0, this.vertexStride = 0, this.dirty = !1
    }

    function Tw2ParticleSystem() {
        this.name = "", this.aliveCount = 0, this.maxParticleCount = 0, this.emitParticleOnDeathEmitter = null, this.emitParticleDuringLifeEmitter = null, this.elements = [], this.isValid = !1, this.requiresSorting = !1, this.updateSimulation = !0, this.applyForce = !0, this.applyAging = !0, this.isGlobal = !1, this.forces = [], this.constraints = [], this.updateBoundingBox = !1, this.aabbMin = vec3.create(), this.aabbMax = vec3.create(), this.peakAliveCount = 0, this.bufferDirty = !1, this._vb = null, this._declaration = null
    }

    function Tw2InstancedMesh() {
        this._super.constructor.call(this), this.instanceGeometryResource = null, this.instanceGeometryResPath = "", this.instanceMeshIndex = 0, this.minBounds = vec3.create(), this.maxBounds = vec3.create()
    }

    function Tw2InstancedMeshBatch() {
        this._super.constructor.call(this), this.instanceMesh = null
    }

    function Tw2StaticEmitter() {
        this.name = "", this.particleSystem = null, this.geometryResourcePath = "", this.geometryResource = null, this.geometryIndex = 0, this._spawned = !1
    }

    function Tw2DynamicEmitter() {
        this.name = "", this.rate = 0, this.isValid = !1, this.particleSystem = null, this._accumulatedRate = 0, this.generators = []
    }

    function Tw2RandomUniformAttributeGenerator() {
        this.elementType = Tw2ParticleElementDeclaration.CUSTOM, this.customName = "", this.minRange = quat4.create(), this.maxRange = quat4.create(), this._element = null
    }

    function Tw2SphereShapeAttributeGenerator() {
        this.minRadius = 0, this.maxRadius = 0, this.minPhi = 0, this.maxPhi = 360, this.minTheta = 0, this.maxTheta = 360, this.controlPosition = !0, this.controlVelocity = !0, this.minSpeed = 0, this.maxSpeed = 0, this.parentVelocityFactor = 1, this.position = vec3.create(), this.rotation = quat4.create([0, 0, 0, 1]), this._position = null, this._velocity = null
    }

    function Tw2ParticleSpring() {
        this.springConstant = 0, this.position = vec3.create()
    }

    function Tw2ParticleDragForce() {
        this.drag = .1
    }

    function Tw2ParticleTurbulenceForce() {
        this.noiseLevel = 3, this.noiseRatio = .5, this.amplitude = vec3.create([1, 1, 1]), this.frequency = quat4.create([1, 1, 1, 1]), this._time = 0
    }

    function InitializeNoise() {
        for (var i = 0; 256 > i; i++) s_noiseLookup[i] = quat4.create([Math.random() - .5, Math.random() - .5, Math.random() - .5, Math.random() - .5]), s_permutations[i] = i;
        for (i = 256; --i;) {
            var tmp = s_permutations[i],
                index = Math.floor(256 * Math.random());
            s_permutations[i] = s_permutations[index], s_permutations[index] = tmp
        }
        for (i = 0; 256 > i; i++) s_permutations[256 + i] = s_permutations[i], s_noiseLookup[256 + i] = s_noiseLookup[i], s_noiseLookup[512 + i] = s_noiseLookup[i];
        for (i = 0; 15 > i; ++i) s_globalNoiseTemps[i] = vec3.create()
    }

    function AddNoise(pos_0, pos_1, pos_2, pos_3, power, result) {
        pos_0 += 4096, pos_1 += 4096, pos_2 += 4096, pos_3 += 4096;
        var a_0 = Math.floor(pos_0),
            a_1 = Math.floor(pos_1),
            a_2 = Math.floor(pos_2),
            a_3 = Math.floor(pos_3),
            t_0 = pos_0 - a_0,
            t_1 = pos_1 - a_1,
            t_2 = pos_2 - a_2,
            t_3 = pos_3 - a_3;
        a_0 &= 255, a_1 &= 255, a_2 &= 255, a_3 &= 255;
        var b_0 = a_0 + 1,
            b_1 = a_1 + 1,
            b_2 = a_2 + 1,
            b_3 = a_3 + 1,
            i = s_permutations[a_0],
            j = s_permutations[b_0],
            b00 = s_permutations[i + a_1],
            b10 = s_permutations[j + a_1],
            b01 = s_permutations[i + b_1],
            b11 = s_permutations[j + b_1],
            c00 = vec3.lerp(s_noiseLookup[b00 + a_2 + a_3], s_noiseLookup[b10 + a_2 + a_3], t_0, s_globalNoiseTemps[0]),
            c10 = vec3.lerp(s_noiseLookup[b01 + a_2 + a_3], s_noiseLookup[b11 + a_2 + a_3], t_0, s_globalNoiseTemps[1]),
            c01 = vec3.lerp(s_noiseLookup[b00 + b_2 + a_3], s_noiseLookup[b10 + b_2 + a_3], t_0, s_globalNoiseTemps[2]),
            c11 = vec3.lerp(s_noiseLookup[b00 + b_2 + a_3], s_noiseLookup[b10 + b_2 + a_3], t_0, s_globalNoiseTemps[3]),
            c0 = vec3.lerp(c00, c10, t_1, s_globalNoiseTemps[4]),
            c1 = vec3.lerp(c01, c11, t_1, s_globalNoiseTemps[5]),
            c = vec3.lerp(c0, c1, t_2, s_globalNoiseTemps[6]);
        c00 = vec3.lerp(s_noiseLookup[b00 + a_2 + b_3], s_noiseLookup[b10 + a_2 + b_3], t_0, s_globalNoiseTemps[7]), c10 = vec3.lerp(s_noiseLookup[b01 + a_2 + b_3], s_noiseLookup[b11 + a_2 + b_3], t_0, s_globalNoiseTemps[8]), c01 = vec3.lerp(s_noiseLookup[b00 + b_2 + b_3], s_noiseLookup[b10 + b_2 + b_3], t_0, s_globalNoiseTemps[9]), c11 = vec3.lerp(s_noiseLookup[b00 + b_2 + b_3], s_noiseLookup[b10 + b_2 + b_3], t_0, s_globalNoiseTemps[10]), c0 = vec3.lerp(c00, c10, t_1, s_globalNoiseTemps[11]), c1 = vec3.lerp(c01, c11, t_1, s_globalNoiseTemps[12]);
        var d = vec3.lerp(c0, c1, t_2, s_globalNoiseTemps[13]),
            r = vec3.lerp(c, d, t_3, s_globalNoiseTemps[14]);
        result[0] += r[0] * power, result[1] += r[1] * power, result[2] += r[2] * power
    }

    function Tw2ParticleDirectForce() {
        this.force = vec3.create()
    }

    function Tw2ParticleAttractorForce() {
        this.magnitude = 0, this.position = vec3.create(), this._tempVec = vec3.create()
    }

    function Tw2ParticleFluidDragForce() {
        this.drag = .1, this._tempVec = vec3.create(), this._tempVec2 = vec3.create()
    }

    function Tw2RandomIntegerAttributeGenerator() {
        this.elementType = Tw2ParticleElementDeclaration.CUSTOM, this.customName = "", this.minRange = quat4.create(), this.maxRange = quat4.create(), this._element = null
    }

    global.ccpwgl_int = exports, Tw2Frustum.prototype.Initialize = function (view, proj, viewportSize) {
        var viewProj = mat4.create();
        mat4.inverse(view, viewProj), this.viewPos.set(viewProj.subarray(12, 14)), this.viewDir.set(viewProj.subarray(8, 10)), this.halfWidthProjection = proj[0] * viewportSize * .5, mat4.multiply(proj, view, viewProj), this.planes[0][0] = viewProj[2], this.planes[0][1] = viewProj[6], this.planes[0][2] = viewProj[10], this.planes[0][3] = viewProj[14], this.planes[1][0] = viewProj[3] + viewProj[0], this.planes[1][1] = viewProj[7] + viewProj[4], this.planes[1][2] = viewProj[11] + viewProj[8], this.planes[1][3] = viewProj[15] + viewProj[12], this.planes[2][0] = viewProj[3] - viewProj[1], this.planes[2][1] = viewProj[7] - viewProj[5], this.planes[2][2] = viewProj[11] - viewProj[9], this.planes[2][3] = viewProj[15] - viewProj[13], this.planes[3][0] = viewProj[3] - viewProj[0], this.planes[3][1] = viewProj[7] - viewProj[4], this.planes[3][2] = viewProj[11] - viewProj[8], this.planes[3][3] = viewProj[15] - viewProj[12], this.planes[4][0] = viewProj[3] + viewProj[1], this.planes[4][1] = viewProj[7] + viewProj[5], this.planes[4][2] = viewProj[11] + viewProj[9], this.planes[4][3] = viewProj[15] + viewProj[13], this.planes[5][0] = viewProj[3] - viewProj[2], this.planes[5][1] = viewProj[7] - viewProj[6], this.planes[5][2] = viewProj[11] - viewProj[10], this.planes[5][3] = viewProj[15] - viewProj[14];
        for (var i = 0; 6 > i; ++i) {
            var len = vec3.length(this.planes[i]);
            this.planes[i][0] /= len, this.planes[i][1] /= len, this.planes[i][2] /= len, this.planes[i][3] /= len
        }
    }, Tw2Frustum.prototype.IsSphereVisible = function (center, radius) {
        for (var i = 0; 6 > i; ++i)
            if (this.planes[i][0] * center[0] + this.planes[i][1] * center[1] + this.planes[i][2] * center[2] + this.planes[i][3] < -radius) return !1;
        return !0
    }, Tw2Frustum.prototype.GetPixelSizeAccross = function (center, radius) {
        var d = vec3.subtract(this.viewPos, center, this._tempVec),
            depth = vec3.dot(this.viewDir, d),
            epsilon = 1e-5;
        if (epsilon > depth && (depth = epsilon), epsilon > radius) return 0;
        var ratio = radius / depth;
        return ratio * this.halfWidthProjection * 2
    }, Tw2RawData.prototype.Declare = function (name, size) {
        this.elements[name] = {
            offset: this.nextOffset,
            size: size,
            array: null
        }, this.nextOffset += size
    }, Tw2RawData.prototype.Create = function () {
        this.data = new Float32Array(this.nextOffset);
        for (var el in this.elements) this.elements[el].array = this.data.subarray(this.elements[el].offset, this.elements[el].offset + this.elements[el].size)
    }, Tw2RawData.prototype.Set = function (name, value) {
        var el = this.elements[name];
        this.data.set(value.length > el.size ? value.subarray(0, el.size) : value, el.offset)
    }, Tw2RawData.prototype.Get = function (name) {
        return this.elements[name].array
    }, Tw2BinaryReader.prototype.ReadUInt8 = function () {
        return this.data[this.cursor++]
    }, Tw2BinaryReader.prototype.ReadInt8 = function () {
        var val = this.data[this.cursor++];
        return val > 127 && (val = val - 255 - 1), val
    }, Tw2BinaryReader.prototype.ReadUInt16 = function () {
        return this.data[this.cursor++] + (this.data[this.cursor++] << 8)
    }, Tw2BinaryReader.prototype.ReadInt16 = function () {
        var val = this.data[this.cursor++] + (this.data[this.cursor++] << 8);
        return val > 32767 && (val = val - 65535 - 1), val
    }, Tw2BinaryReader.prototype.ReadUInt32 = function () {
        return this.data[this.cursor++] + (this.data[this.cursor++] << 8) + (this.data[this.cursor++] << 16) + (this.data[this.cursor++] << 24 >>> 0)
    }, Tw2BinaryReader.prototype.ReadInt32 = function () {
        var val = this.data[this.cursor++] + (this.data[this.cursor++] << 8) + (this.data[this.cursor++] << 16) + (this.data[this.cursor++] << 24 >>> 0);
        return val > 2147483647 && (val = val - 4294967295 - 1), val
    }, Tw2BinaryReader.prototype.ReadFloat16 = function () {
        var b2 = this.data[this.cursor++],
            b1 = this.data[this.cursor++],
            sign = 1 - 2 * (b1 >> 7),
            exp = (b1 >> 2 & 31) - 15,
            sig = (3 & b1) << 8 | b2;
        return 0 == sig && -15 == exp ? 0 : sign * (1 + sig * Math.pow(2, -10)) * Math.pow(2, exp)
    }, Tw2BinaryReader.prototype.ReadFloat32 = function () {
        var b4 = this.data[this.cursor++],
            b3 = this.data[this.cursor++],
            b2 = this.data[this.cursor++],
            b1 = this.data[this.cursor++],
            sign = 1 - 2 * (b1 >> 7),
            exp = (b1 << 1 & 255 | b2 >> 7) - 127,
            sig = (127 & b2) << 16 | b3 << 8 | b4;
        return 0 == sig && -127 == exp ? 0 : sign * (1 + sig * Math.pow(2, -23)) * Math.pow(2, exp)
    }, Tw2BinaryReader.prototype.ReadString = function () {
        for (var length = this.data[this.cursor++], str = "", i = 0; length > i; ++i) str += String.fromCharCode(this.data[this.cursor++]);
        return str
    }, Tw2VertexDeclaration.DECL_POSITION = 0, Tw2VertexDeclaration.DECL_COLOR = 1, Tw2VertexDeclaration.DECL_NORMAL = 2, Tw2VertexDeclaration.DECL_TANGENT = 3, Tw2VertexDeclaration.DECL_BINORMAL = 4, Tw2VertexDeclaration.DECL_TEXCOORD = 5, Tw2VertexDeclaration.DECL_BLENDWEIGHT = 6, Tw2VertexDeclaration.DECL_BLENDINDICES = 7, Tw2VertexDeclaration.prototype.RebuildHash = function () {
        this._elementsSorted = [];
        for (var i = 0; i < this.elements.length; ++i) this._elementsSorted[i] = this.elements[i];
        this._elementsSorted.sort(CompareDeclarationElements)
    }, Tw2VertexDeclaration.prototype.FindUsage = function (usage, usageIndex) {
        for (var i = 0; i < this._elementsSorted.length; ++i) {
            var e = this._elementsSorted[i];
            if (e.usage == usage) {
                if (e.usageIndex == usageIndex) return e;
                if (e.usageIndex > usageIndex) return null
            }
            if (e.usage > usage) return null
        }
        return null
    }, Tw2VertexDeclaration.prototype.SetDeclaration = function (inputDecl, stride) {
        for (var index = 0, i = 0; i < inputDecl._elementsSorted.length; ++i) {
            var el = inputDecl._elementsSorted[i];
            if (!(el.location < 0))
                for (; ;) {
                    var input = this._elementsSorted[index];
                    if (0 == CompareDeclarationElements(input, el)) {
                        input.customSetter ? input.customSetter(el) : (device.gl.enableVertexAttribArray(el.location), device.gl.vertexAttribPointer(el.location, input.elements, input.type, !1, stride, input.offset));
                        break
                    }
                    if (index++, index >= this._elementsSorted.length) return !1
                }
        }
        return !0
    }, Tw2VertexDeclaration.prototype.SetPartialDeclaration = function (inputDecl, stride) {
        for (var index = 0, i = 0; i < inputDecl._elementsSorted.length; ++i) {
            var el = inputDecl._elementsSorted[i];
            if (!(el.location < 0))
                for (; ;) {
                    var input = this._elementsSorted[index],
                        cmp = CompareDeclarationElements(input, el);
                    if (0 == cmp) {
                        input.customSetter ? input.customSetter(el) : (device.gl.enableVertexAttribArray(el.location), device.gl.vertexAttribPointer(el.location, input.elements, input.type, !1, stride, input.offset));
                        break
                    }
                    if (cmp > 0) break;
                    if (index++, index >= this._elementsSorted.length) return !1
                }
        }
        return !0
    }, Tw2ObjectReader.prototype.Construct = function (initialize) {
        this._inputStack = [], this._inputStack.push([this.xmlNode.documentElement, this, "result"]), this._initializeObjects = [], this._ids = [];
        var self = this;
        return function () {
            return self.ConstructFromNode(initialize, !0)
        }
    }, Tw2ObjectReader.prototype.ConstructFromNode = function (initialize, async) {
        for (var now = new Date, startTime = now.getTime(); this._inputStack.length;) {
            var endTime = now.getTime();
            if (async && resMan.prepareBudget < .001 * (endTime - startTime)) return !1;
            var inputData = this._inputStack.pop(),
                xmlNode = inputData[0],
                parent = inputData[1],
                index = inputData[2];
            if (null != xmlNode) {
                var ref = xmlNode.attributes.getNamedItem("ref");
                if (ref) {
                    var object = this._ids[ref.value];
                    parent[index] = object
                } else {
                    var type = xmlNode.attributes.getNamedItem("type");
                    if (type) {
                        var object = null;
                        if ("dict" == type.value) object = {};
                        else try {
                            object = eval("new " + type.value + "()")
                        } catch (e) {
                            throw new Error('YAML: object with undefined type "' + type.value + '"')
                        }
                        this._inputStack.push([null, object, null]);
                        for (var i = 0; i < xmlNode.childNodes.length; ++i) {
                            var child = xmlNode.childNodes[xmlNode.childNodes.length - 1 - i];
                            "#text" != child.nodeName && ("dict" == type.value || "undefined" != typeof object[child.nodeName] ? this._inputStack.push([child, object, child.nodeName]) : console.warn("Tw2ObjectReader:", ' object "', type.value, '" does not have property "', child.nodeName, '"'))
                        }
                        var id = xmlNode.attributes.getNamedItem("id");
                        id && (this._ids[id.value] = object), parent[index] = object
                    } else {
                        var list = xmlNode.attributes.getNamedItem("list");
                        if (list) {
                            object = [];
                            var arrayIndex = 0;
                            this._inputStack.push([null, object, null]);
                            for (var i = 0; i < xmlNode.childNodes.length; ++i) {
                                var child = xmlNode.childNodes[xmlNode.childNodes.length - 1 - i];
                                "#text" != child.nodeName && arrayIndex++
                            }
                            for (var i = 0; i < xmlNode.childNodes.length; ++i) {
                                var child = xmlNode.childNodes[xmlNode.childNodes.length - 1 - i];
                                "#text" != child.nodeName && this._inputStack.push([child, object, --arrayIndex])
                            }
                            var id = xmlNode.attributes.getNamedItem("id");
                            id && (this._ids[id.value] = object), parent[index] = object
                        } else {
                            for (var value = "", i = 0; i < xmlNode.childNodes.length; ++i) {
                                var child = xmlNode.childNodes[i];
                                "#text" == child.nodeName && (value += child.data)
                            }
                            var json = xmlNode.attributes.getNamedItem("json");
                            if (json) {
                                try {
                                    parent[index] = JSON.parse(value.replace(/,\]$/, "]")); // REACTORMONK EDIT
                                } catch (e) {
                                    throw new Error('YAML: property "' + value + '" is not a valid JSON property')
                                }
                                if (!xmlNode.attributes.getNamedItem("notnum")) try {
                                    parent[index] = new Float32Array(parent[index])
                                } catch (e) {
                                }
                                var id = xmlNode.attributes.getNamedItem("id");
                                id && (this._ids[id.value] = parent[index])
                            } else {
                                var capture = /^(\-?\d+\.\d+(?:e|E\-?\d+)?)/.exec(value);
                                capture ? parent[index] = parseFloat(capture[1]) : (capture = /^(\-?\d+)/.exec(value), capture ? parent[index] = parseInt(capture[1], 10) : (capture = /^\b(enabled|true|yes|on)\b/.exec(value), capture ? parent[index] = !0 : (capture = /^\b(disabled|false|no|off)\b/.exec(value), parent[index] = capture ? !1 : value)))
                            }
                        }
                    }
                }
            } else initialize && "undefined" != typeof parent.Initialize && this._initializeObjects.push(parent)
        }
        for (; this._initializeObjects.length;) {
            var endTime = now.getTime();
            if (async && resMan.prepareBudget < .001 * (endTime - startTime)) return !1;
            var object = this._initializeObjects.shift();
            object.Initialize()
        }
        return !0
    }, Tw2Resource.prototype.IsLoading = function () {
        return this.KeepAlive(), this._isLoading
    }, Tw2Resource.prototype.IsGood = function () {
        return this.KeepAlive(), this._isGood
    }, Tw2Resource.prototype.IsPurged = function () {
        return this._isPurged
    }, Tw2Resource.prototype.LoadStarted = function () {
        this._isLoading = !0;
        for (var i = 0; i < this._notifications.length; ++i) this._notifications[i].ReleaseCachedData(this)
    }, Tw2Resource.prototype.LoadFinished = function (success) {
        this._isLoading = !1, success || (this._isGood = !1)
    }, Tw2Resource.prototype.PrepareFinished = function (success) {
        this._isLoading = !1, this._isGood = success;
        for (var i = 0; i < this._notifications.length; ++i) this._notifications[i].RebuildCachedData(this)
    }, Tw2Resource.prototype.SetIsGood = function (success) {
        this._isGood = success
    }, Tw2Resource.prototype.Unload = function () {
    }, Tw2Resource.prototype.Reload = function () {
        this.Unload(), resMan.ReloadResource(this)
    }, Tw2Resource.prototype.KeepAlive = function () {
        this.activeFrame = resMan.activeFrame, this._isPurged && this.Reload()
    }, Tw2Resource.prototype.RegisterNotification = function (notification) {
        for (var i = 0; i < this._notifications.length; ++i)
            if (this._notifications[i] == notification) return;
        this._notifications[this._notifications.length] = notification, this._isGood && notification.RebuildCachedData(this)
    }, Tw2Resource.prototype.UnregisterNotification = function (notification) {
        for (var i = 0; i < this._notifications.length; ++i)
            if (this._notifications[i] == notification) return void this._notifications.splice(i, 1)
    }, Tw2VariableStore.prototype.RegisterVariableWithType = function (name, value, type) {
        return this._variables[name] = new type(name, value)
    }, Tw2VariableStore.prototype.RegisterType = function (name, type) {
        return this._variables[name] = new type(name)
    }, Tw2VariableStore.prototype.RegisterVariable = function (name, value) {
        if (value.constructor == (new glMatrixArrayType).constructor) {
            if (16 == value.length) return this.RegisterVariableWithType(name, value, Tw2MatrixParameter);
            if (4 == value.length) return this.RegisterVariableWithType(name, value, Tw2Vector4Parameter);
            if (3 == value.length) return this.RegisterVariableWithType(name, value, Tw2Vector3Parameter);
            if (2 == value.length) return this.RegisterVariableWithType(name, value, Tw2Vector2Parameter)
        } else {
            if ("number" == typeof value) return this.RegisterVariableWithType(name, value, Tw2FloatParameter);
            if ("string" == typeof value) return this.RegisterVariableWithType(name, value, Tw2TextureParameter)
        }
    };
    var variableStore = new Tw2VariableStore;
    Tw2LoadingObject.prototype.AddObject = function (object, callback, initialize) {
        return object._loadCallback = callback, object._initialize = initialize, this._objects.push(object), !1
    }, Tw2LoadingObject.prototype.Prepare = function (text, xml) {
        if (null == xml) return console.error("Invalid XML for object " + this.path), void this.PrepareFinished(!1);
        for (null === this._inPrepare && (this._redContents = xml, this._constructor = new Tw2ObjectReader(this._redContents), this._constructorFunction = null, this._inPrepare = 0); this._inPrepare < this._objects.length;) {
            if (!this._constructorFunction) {
                var initialize = this._objects[this._inPrepare]._initialize;
                this._constructorFunction = this._constructor.Construct(initialize)
            }
            if (!this._constructorFunction()) return !0;
            this._constructorFunction = null;
            try {
                this._objects[this._inPrepare]._loadCallback(this._constructor.result)
            } catch (e) {
                console.error(e)
            }
            this._inPrepare++
        }
        resMan.motherLode.Remove(this.path), console.info("Prepared " + this.path), this.PrepareFinished(!0)
    }, Inherit(Tw2LoadingObject, Tw2Resource);
    var resMan = new Tw2ResMan;
    Tw2PerObjectData.prototype.SetPerObjectDataToDevice = function (constantBufferHandles) {
        this.perObjectVSData && constantBufferHandles[3] && device.gl.uniform4fv(constantBufferHandles[3], this.perObjectVSData.data), this.perObjectPSData && constantBufferHandles[4] && device.gl.uniform4fv(constantBufferHandles[4], this.perObjectPSData.data)
    }, Tw2SamplerState.prototype.ComputeHash = function () {
        this.hash = 2166136261, this.hash *= 16777619, this.hash ^= this.minFilter, this.hash *= 16777619, this.hash ^= this.maxFilter, this.hash *= 16777619, this.hash ^= this.addressU, this.hash *= 16777619, this.hash ^= this.addressV, this.hash *= 16777619, this.hash ^= this.anisotropy
    }, Tw2SamplerState.prototype.Apply = function (hasMipMaps) {
        var targetType = this.samplerType,
            d = device,
            gl = d.gl;
        gl.texParameteri(targetType, gl.TEXTURE_WRAP_S, hasMipMaps ? this.addressU : gl.CLAMP_TO_EDGE), gl.texParameteri(targetType, gl.TEXTURE_WRAP_T, hasMipMaps ? this.addressV : gl.CLAMP_TO_EDGE), gl.texParameteri(targetType, gl.TEXTURE_MIN_FILTER, hasMipMaps ? this.minFilter : this.minFilterNoMips), gl.texParameteri(targetType, gl.TEXTURE_MAG_FILTER, this.magFilter), d.anisotropicFilter && d.enableAnisotropicFiltering && gl.texParameterf(targetType, d.anisotropicFilter.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(this.anisotropy, d.anisotropicFilter.maxAnisotropy))
    }, Tw2FloatParameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 1 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, void this.Apply(this.constantBuffer, this.offset, size))
    }, Tw2FloatParameter.prototype.Unbind = function () {
        this.constantBuffer = null
    }, Tw2FloatParameter.prototype.OnValueChanged = function () {
        null != this.constantBuffer && (this.constantBuffer[this.offset] = this.value)
    }, Tw2FloatParameter.prototype.Apply = function (constantBuffer, offset) {
        constantBuffer[offset] = this.value
    }, Tw2FloatParameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 1 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, void this.Apply(this.constantBuffer, this.offset, size))
    }, Tw2FloatParameter.prototype.Unbind = function () {
        this.constantBuffer = null
    }, Tw2FloatParameter.prototype.OnValueChanged = function () {
        null != this.constantBuffer && (this.constantBuffer[this.offset] = this.value)
    }, Tw2FloatParameter.prototype.Apply = function (constantBuffer, offset) {
        constantBuffer[offset] = this.value
    }, Tw2Vector2Parameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 2 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, this.Apply(this.constantBuffer, this.offset, size), !0)
    }, Tw2Vector2Parameter.prototype.Unbind = function () {
        this.constantBuffer = null
    }, Tw2Vector2Parameter.prototype.SetValue = function (value) {
        this.value = value, null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2Vector2Parameter.prototype.OnValueChanged = function () {
        null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2Vector2Parameter.prototype.Apply = function (constantBuffer, offset) {
        constantBuffer.set(this.value, offset)
    }, Tw2Vector3Parameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 3 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, this.Apply(this.constantBuffer, this.offset, size), !0)
    }, Tw2Vector3Parameter.prototype.Unbind = function () {
        this.constantBuffer = null
    }, Tw2Vector3Parameter.prototype.SetValue = function (value) {
        this.value = value, null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2Vector3Parameter.prototype.OnValueChanged = function () {
        null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2Vector3Parameter.prototype.Apply = function (constantBuffer, offset) {
        constantBuffer.set(this.value, offset)
    }, Tw2Vector4Parameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 4 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, this.Apply(this.constantBuffer, this.offset, size), !0)
    }, Tw2Vector4Parameter.prototype.Unbind = function () {
        this.constantBuffer = null
    }, Tw2Vector4Parameter.prototype.SetValue = function (value) {
        this.value = value, null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2Vector4Parameter.prototype.OnValueChanged = function () {
        null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2Vector4Parameter.prototype.Apply = function (constantBuffer, offset) {
        constantBuffer.set(this.value, offset)
    }, Tw2MatrixParameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 16 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, void this.Apply(this.constantBuffer, this.offset, size))
    }, Tw2MatrixParameter.prototype.SetValue = function (value) {
        this.value = value, null != this.constantBuffer && this.constantBuffer.set(this.value, this.offset)
    }, Tw2MatrixParameter.prototype.Apply = function (constantBuffer, offset) {
        constantBuffer.set(this.value, offset)
    }, Tw2VariableParameter.prototype.Bind = function () {
        return !1
    }, Tw2VariableParameter.prototype.Apply = function (constantBuffer, offset, size) {
        "undefined" != typeof variableStore._variables[this.variableName] && variableStore._variables[this.variableName].Apply(constantBuffer, offset, size)
    }, Tw2TextureParameter.prototype.SetTexturePath = function (texturePath) {
        this.resourcePath = texturePath, "" != this.resourcePath && (this.textureRes = resMan.GetResource(this.resourcePath))
    }, Tw2TextureParameter.prototype.Initialize = function () {
        if ("" != this.resourcePath && (this.textureRes = resMan.GetResource(this.resourcePath)), this.useAllOverrides) {
            if (this._sampler = new Tw2SamplerState, 1 == this.filterMode) {
                switch (this.mipFilterMode) {
                    case 0:
                        this._sampler.minFilter = device.gl.NEAREST;
                        break;
                    case 1:
                        this._sampler.minFilter = device.gl.NEAREST_MIPMAP_NEAREST;
                        break;
                    default:
                        this._sampler.minFilter = device.gl.NEAREST_MIPMAP_LINEAR
                }
                this._sampler.minFilterNoMips = device.gl.NEAREST, this._sampler.magFilter = device.gl.NEAREST
            } else {
                switch (this.mipFilterMode) {
                    case 0:
                        this._sampler.minFilter = device.gl.LINEAR;
                        break;
                    case 1:
                        this._sampler.minFilter = device.gl.LINEAR_MIPMAP_NEAREST;
                        break;
                    default:
                        this._sampler.minFilter = device.gl.LINEAR_MIPMAP_LINEAR
                }
                this._sampler.minFilterNoMips = device.gl.LINEAR, this._sampler.magFilter = device.gl.LINEAR
            }
            var wrapModes = [0, device.gl.REPEAT, device.gl.MIRRORED_REPEAT, device.gl.CLAMP_TO_EDGE, device.gl.CLAMP_TO_EDGE, device.gl.CLAMP_TO_EDGE];
            this._sampler.addressU = wrapModes[this.addressUMode], this._sampler.addressV = wrapModes[this.addressVMode], this._sampler.addressW = wrapModes[this.addressWMode], this._sampler.anisotropy = this.maxAnisotropy, this._sampler.ComputeHash()
        }
    }, Tw2TextureParameter.prototype.Apply = function (stage, sampler, slices) {
        this.textureRes && (this.useAllOverrides && (this._sampler.samplerType = sampler.samplerType, this._sampler.isVolume = sampler.isVolume, this._sampler.registerIndex = sampler.registerIndex, sampler = this._sampler), device.gl.activeTexture(device.gl.TEXTURE0 + stage), this.textureRes.Bind(sampler, slices))
    }, Tw2TransformParameter.prototype.Initialize = function () {
        this.OnModified()
    }, Tw2TransformParameter.prototype.OnModified = function () {
        mat4.identity(this.worldTransform), mat4.scale(this.worldTransform, this.scaling);
        var rotationCenter = mat4.create();
        mat4.identity(rotationCenter), mat4.translate(rotationCenter, this.rotationCenter);
        var rotationCenterInv = mat4.create();
        mat4.identity(rotationCenterInv), mat4.translate(rotationCenterInv, [-this.rotationCenter[0], -this.rotationCenter[1], -this.rotationCenter[2]]);
        var rotation = mat4.create();
        rotation[0] = 1 - 2 * this.rotation[1] * this.rotation[1] - 2 * this.rotation[2] * this.rotation[2], rotation[4] = 2 * this.rotation[0] * this.rotation[1] - 2 * this.rotation[2] * this.rotation[3], rotation[8] = 2 * this.rotation[0] * this.rotation[2] + 2 * this.rotation[1] * this.rotation[3], rotation[1] = 2 * this.rotation[0] * this.rotation[1] + 2 * this.rotation[2] * this.rotation[3], rotation[5] = 1 - 2 * this.rotation[0] * this.rotation[0] - 2 * this.rotation[2] * this.rotation[2], rotation[9] = 2 * this.rotation[1] * this.rotation[2] - 2 * this.rotation[0] * this.rotation[3], rotation[2] = 2 * this.rotation[0] * this.rotation[2] - 2 * this.rotation[1] * this.rotation[3], rotation[6] = 2 * this.rotation[1] * this.rotation[2] + 2 * this.rotation[0] * this.rotation[3], rotation[10] = 1 - 2 * this.rotation[0] * this.rotation[0] - 2 * this.rotation[1] * this.rotation[1], rotation[15] = 1, mat4.multiply(this.worldTransform, rotationCenterInv), mat4.multiply(this.worldTransform, rotation), mat4.multiply(this.worldTransform, rotationCenter), mat4.translate(this.worldTransform, this.translation), mat4.transpose(this.worldTransform)
    }, Tw2TransformParameter.prototype.Bind = function (constantBuffer, offset, size) {
        return null != this.constantBuffer || 16 > size ? !1 : (this.constantBuffer = constantBuffer, this.offset = offset, void this.Apply(this.constantBuffer, this.offset, size))
    }, Tw2TransformParameter.prototype.OnValueChanged = function () {
        this.OnModified()
    }, Tw2TransformParameter.prototype.Apply = function (constantBuffer, offset, size) {
        size >= 16 ? constantBuffer.set(this.worldTransform, offset) : constantBuffer.set(this.worldTransform.subarray(0, size), offset)
    }, window.requestAnimFrame = function () {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback) {
            window.setTimeout(callback, 1e3 / 60)
        }
    }();
    var device = new Tw2Device;
    Tw2BatchAccumulator.prototype.Commit = function (batch) {
        this.batches[this.count++] = batch
    }, Tw2BatchAccumulator.prototype.Clear = function () {
        this.count = 0
    }, Tw2BatchAccumulator.prototype.Render = function (overrideEffect) {
        "undefined" != typeof this._sortMethod && this.batches.sort(this._sortMethod);
        for (var i = 0; i < this.count; ++i) this.batches[i].renderMode != device.RM_ANY && device.SetStandardStates(this.batches[i].renderMode), device.perObjectData = this.batches[i].perObjectData, this.batches[i].Commit(overrideEffect)
    }, Tw2ForwardingRenderBatch.prototype.Commit = function (overrideEffect) {
        this.geometryProvider && this.geometryProvider.Render(this, overrideEffect)
    }, Inherit(Tw2ForwardingRenderBatch, Tw2RenderBatch), Tw2GeometryBatch.prototype.Commit = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.effect : overrideEffect;
        this.geometryRes && effect && this.geometryRes.RenderAreas(this.meshIx, this.start, this.count, effect)
    }, Inherit(Tw2GeometryBatch, Tw2RenderBatch), Tw2GeometryLineBatch.prototype.Commit = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.effect : overrideEffect;
        this.geometryRes && effect && this.geometryRes.RenderLines(this.meshIx, this.start, this.count, effect)
    }, Inherit(Tw2GeometryLineBatch, Tw2RenderBatch), Tw2GeometryModel.prototype.FindBoneByName = function (name) {
        if (null == this.skeleton) return null;
        for (var b = 0; b < this.skeleton.bones.length; ++b)
            if (this.skeleton.bones[b].name == name) return this.skeleton.bones[b];
        return null
    }, Tw2GeometryBone.prototype.UpdateTransform = function () {
        return mat3.toMat4(this.scaleShear, this.localTransform), mat4.multiply(this.localTransform, mat4.transpose(quat4.toMat4(quat4.normalize(this.orientation)))), this.localTransform[12] = this.position[0], this.localTransform[13] = this.position[1], this.localTransform[14] = this.position[2], this.localTransform
    }, Tw2GeometryRes.prototype.requestResponseType = "arraybuffer", Tw2GeometryRes.prototype.SetInstanceCount = function (instanceCount) {
        this._instanceCount < instanceCount && (this._instanceCount = instanceCount, this.IsGood() && this.Reload())
    }, Tw2GeometryRes.prototype.Prepare = function (data) {
        function ReadVertexBuffer(declaration) {
            for (var declCount = reader.ReadUInt8(), vertexSize = 0, declIx = 0; declCount > declIx; ++declIx) {
                var element = new Tw2VertexElement;
                element.usage = reader.ReadUInt8(), element.usageIndex = reader.ReadUInt8(), element.fileType = reader.ReadUInt8(), element.type = device.gl.FLOAT, element.elements = (element.fileType >> 5) + 1, element.offset = 4 * vertexSize, declaration.elements[declIx] = element, vertexSize += element.elements
            }
            if (declaration.RebuildHash(), declaration.stride = 4 * vertexSize, reader.ReadVertexBuffer) return reader.ReadVertexBuffer(declaration);
            var vertexCount = reader.ReadUInt32();
            if (0 == vertexCount) return null;
            for (var buffer = new Float32Array(vertexSize * vertexCount), index = 0, vtxIx = 0; vertexCount > vtxIx; ++vtxIx)
                for (var declIx = 0; declCount > declIx; ++declIx) {
                    var el = declaration.elements[declIx];
                    switch (15 & el.fileType) {
                        case 0:
                            if (16 & el.fileType)
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadInt8() / 127;
                            else
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadInt8();
                            break;
                        case 1:
                            if (16 & el.fileType)
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadInt8() / 32767;
                            else
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadInt16();
                            break;
                        case 2:
                            for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadInt32();
                            break;
                        case 3:
                            for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadFloat16();
                            break;
                        case 4:
                            for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadFloat32();
                            break;
                        case 8:
                            if (16 & el.fileType)
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadUInt8() / 255;
                            else
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadUInt8();
                            break;
                        case 9:
                            if (16 & el.fileType)
                                for (var i = 0; i < declaration.elements[declIx].elements; ++i) buffer[index++] = reader.ReadUInt8() / 65535;
                            else
                                for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadUInt16();
                            break;
                        case 10:
                            for (var i = 0; i < el.elements; ++i) buffer[index++] = reader.ReadUInt32();
                            break;
                        default:
                            throw console.error("Tw2GeometryRes:", " error loading wbg data (file ", self.path, ")"), 1
                    }
                }
            return buffer
        }

        function ReadIndexBuffer() {
            if (reader.ReadIndexBuffer) return reader.ReadIndexBuffer();
            var ibType = reader.ReadUInt8(),
                indexCount = reader.ReadUInt32();
            if (0 == ibType) {
                for (var indexes = new Uint16Array(indexCount), i = 0; indexCount > i; ++i) indexes[i] = reader.ReadUInt16();
                return indexes
            }
            for (var indexes = new Uint32Array(indexCount), i = 0; indexCount > i; ++i) indexes[i] = reader.ReadUInt32();
            return indexes
        }

        function ReadCurve() {
            var type = reader.ReadUInt8();
            if (0 == type) return null;
            var dimension = reader.ReadUInt8(),
                curve = new Tw2GeometryCurve;
            curve.dimension = dimension, curve.degree = reader.ReadUInt8();
            var knotCount = reader.ReadUInt32();
            curve.knots = new Float32Array(knotCount);
            for (var i = 0; knotCount > i; ++i) curve.knots[i] = reader.ReadFloat32();
            var controlCount = reader.ReadUInt32();
            curve.controls = new Float32Array(controlCount);
            for (var i = 0; controlCount > i; ++i) curve.controls[i] = reader.ReadFloat32();
            return curve
        }

        for (var reader = new Tw2BinaryReader(new Uint8Array(data)), self = this, meshCount = (reader.ReadUInt8(), reader.ReadUInt8()), meshIx = 0; meshCount > meshIx; ++meshIx) {
            var mesh = new Tw2GeometryMesh;
            mesh.name = reader.ReadString();
            var buffer = ReadVertexBuffer(mesh.declaration);
            if (buffer) {
                if (mesh.buffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, mesh.buffer), this._instanceCount > 1) {
                    for (var tmp = new Float32Array(buffer.length * this._instanceCount), i = 0; i < this._instanceCount; ++i) tmp.set(buffer, buffer.length * i);
                    buffer = tmp
                }
                device.gl.bufferData(device.gl.ARRAY_BUFFER, buffer, device.gl.STATIC_DRAW)
            } else mesh.buffer = null;
            var indexes = ReadIndexBuffer();
            if (indexes) {
                if (mesh.indexes = device.gl.createBuffer(), mesh.indexType = 2 == indexes.BYTES_PER_ELEMENT ? device.gl.UNSIGNED_SHORT : device.gl.UNSIGNED_INT, device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, mesh.indexes), this._instanceCount > 1) {
                    for (var tmp = 2 == indexes.BYTES_PER_ELEMENT ? new Uint16Array(indexes.length * this._instanceCount) : new Uint32Array(indexes.length * this._instanceCount), offset = 0, i = 0; i < this._instanceCount; ++i) {
                        for (var j = 0; j < indexes.length; ++j) tmp[j + offset] = indexes[j] + offset;
                        offset += buffer.length
                    }
                    indexes = tmp
                }
                device.gl.bufferData(device.gl.ELEMENT_ARRAY_BUFFER, indexes, device.gl.STATIC_DRAW)
            } else mesh.indexes = null;
            for (var areaCount = reader.ReadUInt8(), i = 0; areaCount > i; ++i) mesh.areas[i] = new Tw2GeometryMeshArea, mesh.areas[i].name = reader.ReadString(), mesh.areas[i].start = reader.ReadUInt32() * indexes.BYTES_PER_ELEMENT, mesh.areas[i].count = 3 * reader.ReadUInt32(), mesh.areas[i].minBounds = vec3.create([reader.ReadFloat32(), reader.ReadFloat32(), reader.ReadFloat32()]), mesh.areas[i].maxBounds = vec3.create([reader.ReadFloat32(), reader.ReadFloat32(), reader.ReadFloat32()]);
            var boneBindingCount = reader.ReadUInt8();
            mesh.boneBindings = [];
            for (var i = 0; boneBindingCount > i; ++i) mesh.boneBindings[i] = reader.ReadString();
            var annotationSetCount = reader.ReadUInt16();
            if ((annotationSetCount || this.systemMirror) && (mesh.bufferData = buffer), annotationSetCount) {
                mesh.blendShapes = [];
                for (var i = 0; annotationSetCount > i; ++i) mesh.blendShapes[i] = new Tw2BlendShapeData, mesh.blendShapes[i].name = reader.ReadString(), mesh.blendShapes[i].buffer = ReadVertexBuffer(mesh.blendShapes[i].declaration), mesh.blendShapes[i].indexes = ReadIndexBuffer()
            }
            this.meshes[meshIx] = mesh
        }
        for (var modelCount = reader.ReadUInt8(), modelIx = 0; modelCount > modelIx; ++modelIx) {
            var model = new Tw2GeometryModel;
            model.name = reader.ReadString(), model.skeleton = new Tw2GeometrySkeleton;
            for (var boneCount = reader.ReadUInt8(), j = 0; boneCount > j; ++j) {
                var bone = new Tw2GeometryBone;
                bone.name = reader.ReadString();
                var flags = reader.ReadUInt8();
                if (bone.parentIndex = reader.ReadUInt8(), 255 == bone.parentIndex && (bone.parentIndex = -1), 1 & flags ? vec3.set([reader.ReadFloat32(), reader.ReadFloat32(), reader.ReadFloat32()], bone.position) : vec3.set([0, 0, 0], bone.position), 2 & flags ? quat4.set([reader.ReadFloat32(), reader.ReadFloat32(), reader.ReadFloat32(), reader.ReadFloat32()], bone.orientation) : quat4.set([0, 0, 0, 1], bone.orientation), 4 & flags)
                    for (var k = 0; 9 > k; ++k) bone.scaleShear[k] = reader.ReadFloat32();
                else mat3.identity(bone.scaleShear);
                model.skeleton.bones[j] = bone
            }
            for (var j = 0; j < model.skeleton.bones.length; ++j) model.skeleton.bones[j].UpdateTransform(), -1 != model.skeleton.bones[j].parentIndex ? mat4.multiply(model.skeleton.bones[model.skeleton.bones[j].parentIndex].worldTransform, model.skeleton.bones[j].localTransform, model.skeleton.bones[j].worldTransform) : mat4.set(model.skeleton.bones[j].localTransform, model.skeleton.bones[j].worldTransform), mat4.inverse(model.skeleton.bones[j].worldTransform, model.skeleton.bones[j].worldTransformInv);
            var meshBindingCount = reader.ReadUInt8();
            for (j = 0; meshBindingCount > j; ++j) mesh = reader.ReadUInt8(), mesh < this.meshes.length && Tw2GeometryRes.BindMeshToModel(this.meshes[mesh], model);
            this.models[this.models.length] = model
        }
        for (var animationCount = reader.ReadUInt8(), i = 0; animationCount > i; ++i) {
            var animation = new Tw2GeometryAnimation;
            animation.name = reader.ReadString(), animation.duration = reader.ReadFloat32();
            for (var groupCount = reader.ReadUInt8(), j = 0; groupCount > j; ++j) {
                var group = new Tw2GeometryTrackGroup;
                group.name = reader.ReadString();
                for (var m = 0; m < this.models.length; ++m)
                    if (this.models[m].name == name) {
                        group.model = this.models[m];
                        break
                    }
                for (var transformTrackCount = reader.ReadUInt8(), k = 0; transformTrackCount > k; ++k) {
                    var track = new Tw2GeometryTransformTrack;
                    if (track.name = reader.ReadString(), track.orientation = ReadCurve(), track.position = ReadCurve(), track.scaleShear = ReadCurve(), track.orientation)
                        for (var lastX = 0, lastY = 0, lastZ = 0, lastW = 0, n = 0; n < track.orientation.controls.length; n += 4) {
                            var x = track.orientation.controls[n],
                                y = track.orientation.controls[n + 1],
                                z = track.orientation.controls[n + 2],
                                w = track.orientation.controls[n + 3];
                            0 > lastX * x + lastY * y + lastZ * z + lastW * w && (track.orientation.controls[n] = -x, track.orientation.controls[n + 1] = -y, track.orientation.controls[n + 2] = -z, track.orientation.controls[n + 3] = -w), lastX = x, lastY = y, lastZ = z, lastW = w
                        }
                    group.transformTracks[group.transformTracks.length] = track
                }
                animation.trackGroups[animation.trackGroups.length] = group
            }
            this.animations[this.animations.length] = animation
        }
        this.PrepareFinished(!0)
    }, Tw2GeometryRes.BindMeshToModel = function (mesh, model) {
        var binding = new Tw2GeometryMeshBinding;
        binding.mesh = mesh;
        for (var b = 0; b < binding.mesh.boneBindings.length; ++b) {
            var name = binding.mesh.boneBindings[b],
                bone = model.FindBoneByName(name);
            null == bone ? console.error("Tw2GeometryRes:", "mesh '", binding.mesh.name, "' has invalid bone name '", name, "' for model '", model.name, "'") : binding.bones[binding.bones.length] = bone
        }
        model.meshBindings[model.meshBindings.length] = binding
    }, Tw2GeometryRes.prototype.RenderAreas = function (meshIx, start, count, effect, cb) {
        if (this.KeepAlive(), !this._isGood) return !1;
        var effectRes = effect.GetEffectRes();
        if (!effectRes._isGood) return !1;
        var d = device,
            mesh = this.meshes[meshIx];
        d.gl.bindBuffer(d.gl.ARRAY_BUFFER, mesh.buffer), d.gl.bindBuffer(d.gl.ELEMENT_ARRAY_BUFFER, mesh.indexes);
        for (var passCount = effect.GetPassCount(), pass = 0; passCount > pass; ++pass) {
            effect.ApplyPass(pass);
            var passInput = effect.GetPassInput(pass);
            if (!mesh.declaration.SetDeclaration(passInput, mesh.declaration.stride)) return console.error("Tw2GeometryRes:", " error binding mesh to effect"), !1;
            if (d.ApplyShadowState(), "undefined" != typeof cb) {
                for (var drawElements = [], i = 0; count > i; ++i)
                    if (i + start < mesh.areas.length) {
                        var area = mesh.areas[i + start];
                        drawElements.push([d.gl.TRIANGLES, area.count, mesh.indexType, area.start])
                    }
                cb(pass, drawElements)
            } else
                for (var i = 0; count > i; ++i)
                    if (i + start < mesh.areas.length) {
                        for (var area = mesh.areas[i + start], start = area.start, acount = area.count; count > i + 1;) {
                            var area = mesh.areas[i + 1 + start];
                            if (area.start != start + 2 * acount) break;
                            acount += area.count, ++i
                        }
                        d.gl.drawElements(d.gl.TRIANGLES, acount, mesh.indexType, start)
                    }
        }
        return !0
    }, Tw2GeometryRes.prototype.RenderLines = function (meshIx, start, count, effect, cb) {
        if (this.KeepAlive(), !this._isGood) return !1;
        var effectRes = effect.GetEffectRes();
        if (!effectRes._isGood) return !1;
        if (meshIx >= this.meshes.length) return !1;
        var d = device,
            mesh = this.meshes[meshIx];
        d.gl.bindBuffer(d.gl.ARRAY_BUFFER, mesh.buffer), d.gl.bindBuffer(d.gl.ELEMENT_ARRAY_BUFFER, mesh.indexes);
        for (var passCount = effect.GetPassCount(), pass = 0; passCount > pass; ++pass) {
            effect.ApplyPass(pass);
            var passInput = effect.GetPassInput(pass);
            if (!mesh.declaration.SetDeclaration(passInput, mesh.declaration.stride)) return console.error("Tw2GeometryRes:", " error binding mesh to effect"), !1;
            if (d.ApplyShadowState(), "undefined" != typeof cb) {
                for (var drawElements = [], i = 0; count > i; ++i)
                    if (i + start < mesh.areas.length) {
                        var area = mesh.areas[i + start];
                        drawElements.push([d.gl.LINES, area.count, mesh.indexType, area.start])
                    }
                cb(pass, drawElements)
            } else
                for (var i = 0; count > i; ++i)
                    if (i + start < mesh.areas.length) {
                        for (var area = mesh.areas[i + start], start = area.start, acount = area.count; count > i + 1;) {
                            var area = mesh.areas[i + 1 + start];
                            if (area.start != start + 2 * acount) break;
                            acount += area.count, ++i
                        }
                        d.gl.drawElements(d.gl.LINES, acount, mesh.indexType, start)
                    }
        }
        return !0
    }, Tw2GeometryRes.prototype.RenderDebugInfo = function (debugHelper) {
        if (!this.IsGood()) return !1;
        for (var i = 0; i < this.models.length; ++i)
            if (this.models[i].skeleton)
                for (var j = 0; j < this.models[i].skeleton.bones.length; ++j) {
                    var b0 = this.models[i].skeleton.bones[j];
                    if (b0.parentIndex >= 0) {
                        var b1 = this.models[i].skeleton.bones[b0.parentIndex];
                        debugHelper.AddLine([b0.worldTransform[12], b0.worldTransform[13], b0.worldTransform[14]], [b1.worldTransform[12], b1.worldTransform[13], b1.worldTransform[14]], [0, .7, 0, 1], [0, .7, 0, 1])
                    }
                }
    }, Tw2GeometryRes.prototype.Unload = function () {
        for (var i = 0; i < this.meshes.length; ++i) this.meshes[i].buffer && (device.gl.deleteBuffer(this.meshes[i].buffer), this.meshes[i].buffer = null), this.meshes[i].indexes && (device.gl.deleteBuffer(this.meshes[i].indexes), this.meshes[i].indexes = null);
        return this._isPurged = !0, this._isGood = !1, !0
    }, Inherit(Tw2GeometryRes, Tw2Resource), resMan.RegisterExtension("wbg", Tw2GeometryRes), Tw2TextureRes.prototype.Prepare = function (text) {
        var format = device.gl.RGBA;
        if (this.images[0].ccpGLFormat && (format = this.images[0].ccpGLFormat), "cube" == text) {
            this.texture = device.gl.createTexture(), device.gl.bindTexture(device.gl.TEXTURE_CUBE_MAP, this.texture);
            var canvas = document.createElement("canvas");
            canvas.width = canvas.height = this.images[0].height;
            for (var ctx = canvas.getContext("2d"), j = 0; 6 > j; ++j) ctx.drawImage(this.images[0], j * canvas.width, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height), device.gl.texImage2D(device.gl.TEXTURE_CUBE_MAP_POSITIVE_X + j, 0, format, format, device.gl.UNSIGNED_BYTE, canvas);
            device.gl.generateMipmap(device.gl.TEXTURE_CUBE_MAP), device.gl.bindTexture(device.gl.TEXTURE_CUBE_MAP, null), this.width = canvas.width, this.height = canvas.height, this.hasMipMaps = !0, this.PrepareFinished(!0)
        } else this.texture = device.gl.createTexture(), device.gl.bindTexture(device.gl.TEXTURE_2D, this.texture), device.gl.texImage2D(device.gl.TEXTURE_2D, 0, format, format, device.gl.UNSIGNED_BYTE, this.images[0]), this.hasMipMaps = this.IsPowerOfTwo(this.images[0].width) && this.IsPowerOfTwo(this.images[0].height), this.hasMipMaps && device.gl.generateMipmap(device.gl.TEXTURE_2D), device.gl.bindTexture(device.gl.TEXTURE_2D, null), this.width = this.images[0].width, this.height = this.images[0].height, this.PrepareFinished(!0);
        delete this.images
    }, Tw2TextureRes.prototype.IsPowerOfTwo = function (x) {
        return 0 == (x & x - 1)
    }, Tw2TextureRes.prototype.DoCustomLoad = function (path) {
        this.LoadStarted(), this.images = [];
        var self = this;
        path = resMan.BuildUrl(path);
        var mipExt = "";
        if (device.mipLevelSkipCount > 0 && (mipExt = "." + device.mipLevelSkipCount.toString()), ".cube" == path.substr(-5)) {
            if (resMan._pendingLoads++, this.isCube = !0, this.images[0] = new Image, this.images[0].crossOrigin = "anonymous", this.images[0].onload = function () {
                resMan._pendingLoads--, self.LoadFinished(!0), resMan._prepareQueue.push([self, "cube", null])
            }, path = path.substr(0, path.length - 5) + ".png", device.mipLevelSkipCount > 0) {
                var index = path.lastIndexOf(".");
                index >= 0 && (path = path.substr(0, index - 2) + mipExt + path.substr(index))
            }
            this.images[0].src = path
        } else {
            if (resMan._pendingLoads++, this.isCube = !1, this.images[0] = new Image, this.images[0].crossOrigin = "anonymous", this.images[0].onload = function () {
                resMan._pendingLoads--, self.LoadFinished(!0), resMan._prepareQueue.push([self, "", null])
            }, device.mipLevelSkipCount > 0) {
                var index = path.lastIndexOf(".");
                index >= 0 && (path = path.substr(0, index - 2) + mipExt + path.substr(index))
            }
            this.images[0].src = path
        }
        return !0
    }, Tw2TextureRes.prototype.Unload = function () {
        return this.texture && (device.gl.deleteTexture(this.texture), this.texture = null, this.isPurged = !0), this._isPurged = !0, this._isGood = !1, !0
    }, Tw2TextureRes.prototype.Attach = function (texture) {
        this.texture = texture, this.LoadFinished(!0), this.PrepareFinished(!0)
    }, Tw2TextureRes.prototype.Bind = function (sampler, slices) {
        this.KeepAlive();
        var targetType = sampler.samplerType;
        if (targetType == (this.isCube ? device.gl.TEXTURE_CUBE_MAP : device.gl.TEXTURE_2D)) {
            if (null == this.texture) return void device.gl.bindTexture(targetType, targetType == device.gl.TEXTURE_2D ? device.GetFallbackTexture() : device.GetFallbackCubeMap());
            sampler.isVolume && device.gl.uniform1f(slices, this.height / this.width), device.gl.bindTexture(targetType, this.texture), sampler.hash != this._currentSampler && (sampler.Apply(this.hasMipMaps), this._currentSampler = sampler.hash)
        }
    }, Inherit(Tw2TextureRes, Tw2Resource), resMan.RegisterExtension("png", Tw2TextureRes), resMan.RegisterExtension("cube", Tw2TextureRes), Tw2EffectRes.prototype.requestResponseType = "arraybuffer", Tw2EffectRes.prototype.Prepare = function (data) {
        function ReadString() {
            for (var offset = reader.ReadUInt32(), end = offset; stringTable.charCodeAt(end);) ++end;
            return stringTable.substr(offset, end - offset)
        }

        function CompileShader(stageType, prefix, shaderCode, path) {
            var shader = device.gl.createShader(0 == stageType ? device.gl.VERTEX_SHADER : device.gl.FRAGMENT_SHADER);
            if (device.useBinaryShaders) device.shaderBinary.shaderBinary(shader, shaderCode);
            else {
                var source = prefix + String.fromCharCode.apply(null, shaderCode);
                source = source.substr(0, source.length - 1), device.gl.shaderSource(shader, source), device.gl.compileShader(shader)
            }
            return device.gl.getShaderParameter(shader, device.gl.COMPILE_STATUS) ? shader : (console.error("Tw2EffectRes:", " error compiling ", 0 == stageType ? "vertex" : "fragment", " shader (effect '", path, "'): ", device.gl.getShaderInfoLog(shader)), null)
        }

        function CreateProgram(vertexShader, fragmentShader, pass, path) {
            var program = {};
            if (program.program = device.gl.createProgram(), device.gl.attachShader(program.program, vertexShader), device.gl.attachShader(program.program, fragmentShader), device.gl.linkProgram(program.program), !device.gl.getProgramParameter(program.program, device.gl.LINK_STATUS)) return console.error("Tw2EffectRes:", " error linking shaders (effect '", path, "'): ", device.gl.getProgramInfoLog(program.program)), null;
            device.gl.useProgram(program.program), program.constantBufferHandles = [];
            for (var j = 0; 16 > j; ++j) program.constantBufferHandles[j] = device.gl.getUniformLocation(program.program, "cb" + j);
            program.samplerHandles = [];
            for (var j = 0; 16 > j; ++j) program.samplerHandles[j] = device.gl.getUniformLocation(program.program, "s" + j), device.gl.uniform1i(program.samplerHandles[j], j);
            for (var j = 0; 16 > j; ++j) program.samplerHandles[j + 12] = device.gl.getUniformLocation(program.program, "vs" + j), device.gl.uniform1i(program.samplerHandles[j + 12], j + 12);
            program.input = new Tw2VertexDeclaration;
            for (var j = 0; j < pass.stages[0].inputDefinition.elements.length; ++j) {
                var location = device.gl.getAttribLocation(program.program, "attr" + j);
                if (location >= 0) {
                    var el = new Tw2VertexElement(pass.stages[0].inputDefinition.elements[j].usage, pass.stages[0].inputDefinition.elements[j].usageIndex);
                    el.location = location, program.input.elements.push(el)
                }
            }
            program.input.RebuildHash(), program.shadowStateInt = device.gl.getUniformLocation(program.program, "ssi"), program.shadowStateFloat = device.gl.getUniformLocation(program.program, "ssf"), program.shadowStateYFlip = device.gl.getUniformLocation(program.program, "ssyf"), device.gl.uniform3f(program.shadowStateYFlip, 0, 0, 1), program.volumeSlices = [];
            for (var j = 0; j < pass.stages[1].samplers.length; ++j) pass.stages[1].samplers[j].isVolume && (program.volumeSlices[pass.stages[1].samplers[j].registerIndex] = device.gl.getUniformLocation(program.program, "s" + pass.stages[1].samplers[j].registerIndex + "sl"));
            return program
        }

        this.passes = [], this.annotations = {};
        var reader = new Tw2BinaryReader(new Uint8Array(data)),
            stringTable = "",
            version = reader.ReadUInt32();
        if (2 > version || version > 4) return console.error("Tw2EffectRes:", ' invalid version of effect file "', this.path, '" (version ', version, ")"), void this.PrepareFinished(!1);
        var headerSize = reader.ReadUInt32();
        if (0 == headerSize) return console.error("Tw2EffectRes:", ' file "', this.path, '" contains no compiled effects'), void this.PrepareFinished(!1);
        reader.ReadUInt32();
        var offset = reader.ReadUInt32();
        reader.cursor = 8 + 3 * headerSize * 4;
        var stringTableSize = reader.ReadUInt32();
        stringTable = String.fromCharCode.apply(null, reader.data.subarray(reader.cursor, reader.cursor + stringTableSize)), reader.cursor = offset;
        for (var passCount = reader.ReadUInt8(), passIx = 0; passCount > passIx; ++passIx) {
            var pass = {};
            pass.stages = [
                {},
                {}
            ];
            for (var stageCount = reader.ReadUInt8(), validShadowShader = !0, stageIx = 0; stageCount > stageIx; ++stageIx) {
                var stage = {};
                stage.inputDefinition = new Tw2VertexDeclaration, stage.constants = [], stage.textures = [], stage.samplers = [];
                for (var stageType = reader.ReadUInt8(), inputCount = reader.ReadUInt8(), inputIx = 0; inputCount > inputIx; ++inputIx) {
                    var usage = reader.ReadUInt8();
                    reader.ReadUInt8();
                    var usageIndex = reader.ReadUInt8();
                    reader.ReadUInt8(), stage.inputDefinition.elements[inputIx] = new Tw2VertexElement(usage, usageIndex, 0)
                }
                stage.inputDefinition.RebuildHash();
                var shaderSize = reader.ReadUInt32(),
                    shaderCode = reader.data.subarray(reader.cursor, reader.cursor + shaderSize);
                reader.cursor += shaderSize;
                var shadowShaderSize = reader.ReadUInt32(),
                    shadowShaderCode = reader.data.subarray(reader.cursor, reader.cursor + shadowShaderSize);
                if (reader.cursor += shadowShaderSize, stage.shader = CompileShader(stageType, "", shaderCode, this.path), null == stage.shader) return void this.PrepareFinished(!1);
                validShadowShader ? (stage.shadowShader = 0 == shadowShaderSize ? CompileShader(stageType, "\n#define PS\n", shaderCode, this.path) : CompileShader(stageType, "", shadowShaderCode, this.path), null == stage.shadowShader && (validShadowShader = !1)) : stage.shadowShader = null, version >= 3 && (reader.ReadUInt32(), reader.ReadUInt32(), reader.ReadUInt32()), stage.constantSize = 0;
                for (var constantCount = reader.ReadUInt32(), constantIx = 0; constantCount > constantIx; ++constantIx) {
                    var constant = {};
                    if (constant.name = ReadString(), constant.offset = reader.ReadUInt32() / 4, constant.size = reader.ReadUInt32() / 4, constant.type = reader.ReadUInt8(), constant.dimension = reader.ReadUInt8(), constant.elements = reader.ReadUInt32(), constant.isSRGB = reader.ReadUInt8(), constant.isAutoregister = reader.ReadUInt8(), stage.constants[constantIx] = constant, "PerFrameVS" != constant.name && "PerObjectVS" != constant.name && "PerFramePS" != constant.name && "PerObjectPS" != constant.name) {
                        var last = constant.offset + constant.size;
                        last > stage.constantSize && (stage.constantSize = last)
                    }
                }
                var constantValueSize = reader.ReadUInt32() / 4;
                stage.constantValues = new Float32Array(constantValueSize);
                for (var i = 0; constantValueSize > i; ++i) stage.constantValues[i] = reader.ReadFloat32();
                stage.constantSize = Math.max(stage.constantSize, constantValueSize);
                for (var textureCount = reader.ReadUInt8(), textureIx = 0; textureCount > textureIx; ++textureIx) {
                    var registerIndex = reader.ReadUInt8(),
                        texture = {};
                    texture.registerIndex = registerIndex, texture.name = ReadString(), texture.type = reader.ReadUInt8(), texture.isSRGB = reader.ReadUInt8(), texture.isAutoregister = reader.ReadUInt8(), stage.textures.push(texture)
                }
                for (var samplerCount = reader.ReadUInt8(), samplerIx = 0; samplerCount > samplerIx; ++samplerIx) {
                    var registerIndex = reader.ReadUInt8(),
                        samplerName = "";
                    version >= 4 && (samplerName = ReadString()), reader.ReadUInt8();
                    var minFilter = reader.ReadUInt8(),
                        magFilter = reader.ReadUInt8(),
                        mipFilter = reader.ReadUInt8(),
                        addressU = reader.ReadUInt8(),
                        addressV = reader.ReadUInt8(),
                        addressW = reader.ReadUInt8(),
                        maxAnisotropy = (reader.ReadFloat32(), reader.ReadUInt8());
                    reader.ReadUInt8();
                    var borderColor = quat4.create();
                    borderColor[0] = reader.ReadFloat32(), borderColor[1] = reader.ReadFloat32(), borderColor[2] = reader.ReadFloat32(), borderColor[3] = reader.ReadFloat32();
                    {
                        reader.ReadFloat32(), reader.ReadFloat32()
                    }
                    4 > version && reader.ReadUInt8();
                    var sampler = new Tw2SamplerState;
                    if (sampler.registerIndex = registerIndex, sampler.name = samplerName, 1 == minFilter) {
                        switch (mipFilter) {
                            case 0:
                                sampler.minFilter = device.gl.NEAREST;
                                break;
                            case 1:
                                sampler.minFilter = device.gl.NEAREST_MIPMAP_NEAREST;
                                break;
                            default:
                                sampler.minFilter = device.gl.NEAREST_MIPMAP_LINEAR
                        }
                        sampler.minFilterNoMips = device.gl.NEAREST
                    } else {
                        switch (mipFilter) {
                            case 0:
                                sampler.minFilter = device.gl.LINEAR;
                                break;
                            case 1:
                                sampler.minFilter = device.gl.LINEAR_MIPMAP_NEAREST;
                                break;
                            default:
                                sampler.minFilter = device.gl.LINEAR_MIPMAP_LINEAR
                        }
                        sampler.minFilterNoMips = device.gl.LINEAR
                    }
                    sampler.magFilter = 1 == magFilter ? device.gl.NEAREST : device.gl.LINEAR;
                    var wrapModes = [0, device.gl.REPEAT, device.gl.MIRRORED_REPEAT, device.gl.CLAMP_TO_EDGE, device.gl.CLAMP_TO_EDGE, device.gl.CLAMP_TO_EDGE];
                    sampler.addressU = wrapModes[addressU], sampler.addressV = wrapModes[addressV], sampler.addressW = wrapModes[addressW], (3 == minFilter || 3 == magFilter || 3 == mipFilter) && (sampler.anisotropy = Math.max(maxAnisotropy, 1));
                    for (var n = 0; n < stage.textures.length; ++n)
                        if (stage.textures[n].registerIndex == sampler.registerIndex) {
                            sampler.samplerType = 4 == stage.textures[n].type ? device.gl.TEXTURE_CUBE_MAP : device.gl.TEXTURE_2D, sampler.isVolume = 3 == stage.textures[n].type;
                            break
                        }
                    sampler.ComputeHash(), stage.samplers.push(sampler)
                }
                version >= 3 && reader.ReadUInt8(), pass.stages[stageType] = stage
            }
            pass.states = [];
            for (var stateCount = reader.ReadUInt8(), stateIx = 0; stateCount > stateIx; ++stateIx) {
                var state = reader.ReadUInt32(),
                    value = reader.ReadUInt32();
                pass.states.push({
                    state: state,
                    value: value
                })
            }
            if (pass.shaderProgram = CreateProgram(pass.stages[0].shader, pass.stages[1].shader, pass, this.path), null == pass.shaderProgram) return void this.PrepareFinished(!1);
            validShadowShader ? (pass.shadowShaderProgram = CreateProgram(pass.stages[0].shadowShader, pass.stages[1].shadowShader, pass, this.path), null == pass.shadowShaderProgram && (pass.shadowShaderProgram = pass.shaderProgram)) : pass.shadowShaderProgram = pass.shaderProgram, this.passes[passIx] = pass
        }
        for (var parameterCount = reader.ReadUInt16(), paramIx = 0; parameterCount > paramIx; ++paramIx) {
            for (var name = ReadString(), annotations = [], annotationCount = reader.ReadUInt8(), annotationIx = 0; annotationCount > annotationIx; ++annotationIx) switch (annotations[annotationIx] = {}, annotations[annotationIx].name = ReadString(), annotations[annotationIx].type = reader.ReadUInt8(), annotations[annotationIx].type) {
                case 0:
                    annotations[annotationIx].value = 0 != reader.ReadUInt32();
                    break;
                case 1:
                    annotations[annotationIx].value = reader.ReadInt32();
                    break;
                case 2:
                    annotations[annotationIx].value = reader.ReadFloat32();
                    break;
                default:
                    annotations[annotationIx].value = ReadString()
            }
            this.annotations[name] = annotations
        }
        this.PrepareFinished(!0)
    }, Tw2EffectRes.prototype.ApplyPass = function (pass) {
        pass = this.passes[pass];
        for (var i = 0; i < pass.states.length; ++i) device.SetRenderState(pass.states[i].state, pass.states[i].value);
        device.IsAlphaTestEnabled() ? (device.gl.useProgram(pass.shadowShaderProgram.program), device.shadowHandles = pass.shadowShaderProgram) : (device.gl.useProgram(pass.shaderProgram.program), device.shadowHandles = null)
    }, Inherit(Tw2EffectRes, Tw2Resource), resMan.RegisterExtension("sm_hi", Tw2EffectRes), resMan.RegisterExtension("sm_lo", Tw2EffectRes), Tw2Effect.prototype.Initialize = function () {
        if ("" != this.effectFilePath) {
            {
                var path = this.effectFilePath,
                    dot = path.lastIndexOf(".");
                path.substr(dot)
            }
            path = path.toLowerCase().substr(0, dot).replace("/effect/", device.effectDir) + ".sm_" + device.shaderModel, this.effectRes = resMan.GetResource(path), this.effectRes.RegisterNotification(this)
        }
    }, Tw2Effect.prototype.GetEffectRes = function () {
        return this.effectRes
    }, Tw2Effect.prototype.RebuildCachedData = function (resource) {
        resource.IsGood() && this.BindParameters()
    }, Tw2Effect.prototype.BindParameters = function () {
        if (null == this.effectRes || !this.effectRes.IsGood()) return !1;
        for (var i = 0; i < this.passes.length; ++i)
            for (var j = 0; j < this.passes[i].stages.length; ++j)
                for (var k = 0; k < this.passes[i].stages[j].reroutedParameters.length; ++k) this.passes[i].stages[j].reroutedParameters[k].Unbind();
        this.passes = [];
        for (var i = 0; i < this.effectRes.passes.length; ++i) {
            var pass = [];
            pass.stages = [];
            for (var j = 0; j < this.effectRes.passes[i].stages.length; ++j) {
                var stageRes = this.effectRes.passes[i].stages[j],
                    stage = {};
                stage.constantBuffer = new Float32Array(stageRes.constantSize), stage.reroutedParameters = [], stage.parameters = [], stage.textures = [], stage.constantBuffer.set(stageRes.constantValues);
                for (var k = 0; k < stageRes.constants.length; ++k) {
                    var constant = stageRes.constants[k],
                        name = constant.name;
                    if ("PerFrameVS" != name && "PerObjectVS" != name && "PerFramePS" != name && "PerObjectPS" != name && "PerObjectPSInt" != name)
                        if (name in this.parameters) {
                            var param = this.parameters[name];
                            if (param.Bind(stage.constantBuffer, constant.offset, constant.size)) stage.reroutedParameters.push(param);
                            else {
                                var p = {};
                                p.parameter = param, p.constantBuffer = stage.constantBuffer, p.offset = constant.offset, p.size = constant.size, stage.parameters.push(p)
                            }
                        } else if (name in variableStore._variables) {
                            var param = variableStore._variables[name],
                                p = {};
                            p.parameter = param, p.constantBuffer = stage.constantBuffer, p.offset = constant.offset, p.size = constant.size, stage.parameters.push(p)
                        } else if (constant.isAutoregister) {
                            variableStore.RegisterType(name, constant.type);
                            var param = variableStore._variables[name],
                                p = {};
                            p.parameter = param, p.constantBuffer = stage.constantBuffer, p.offset = constant.offset, p.size = constant.size, stage.parameters.push(p)
                        }
                }
                for (var k = 0; k < stageRes.textures.length; ++k) {
                    var name = stageRes.textures[k].name,
                        param = null;
                    if (name in this.parameters) param = this.parameters[name];
                    else if (name in variableStore._variables) param = variableStore._variables[name];
                    else {
                        if (!stageRes.textures[k].isAutoregister) continue;
                        variableStore.RegisterType(name, Tw2TextureParameter), param = variableStore._variables[name]
                    }
                    var p = {};
                    p.parameter = param, p.slot = stageRes.textures[k].registerIndex, p.sampler = null;
                    for (var n = 0; n < stageRes.samplers.length; ++n)
                        if (stageRes.samplers[n].registerIndex == p.slot) {
                            p.sampler = stageRes.samplers[n].name in this.samplerOverrides ? this.samplerOverrides[stageRes.samplers[n].name].GetSampler(stageRes.samplers[n]) : stageRes.samplers[n];
                            break
                        }
                    0 == j && (p.slot += 12), stage.textures.push(p)
                }
                pass.stages.push(stage)
            }
            this.passes.push(pass)
        }
        return device.effectObserver && device.effectObserver.OnEffectChanged(this), !0
    }, Tw2Effect.prototype.ApplyPass = function (pass) {
        if (null != this.effectRes && this.effectRes.IsGood() && !(pass >= this.passes.length)) {
            this.effectRes.ApplyPass(pass);
            var p = this.passes[pass],
                rp = this.effectRes.passes[pass],
                d = device;
            if (d.IsAlphaTestEnabled() && rp.shadowShaderProgram) var program = rp.shadowShaderProgram;
            else var program = rp.shaderProgram;
            for (var i = 0; 2 > i; ++i) {
                for (var stages = p.stages[i], j = 0; j < stages.parameters.length; ++j) {
                    var pp = stages.parameters[j];
                    pp.parameter.Apply(pp.constantBuffer, pp.offset, pp.size)
                }
                for (var j = 0; j < stages.textures.length; ++j) {
                    var tex = stages.textures[j];
                    tex.parameter.Apply(tex.slot, tex.sampler, program.volumeSlices[tex.sampler.registerIndex])
                }
            }
            null != program.constantBufferHandles[0] && d.gl.uniform4fv(program.constantBufferHandles[0], p.stages[0].constantBuffer), null != program.constantBufferHandles[7] && d.gl.uniform4fv(program.constantBufferHandles[7], p.stages[1].constantBuffer), device.perFrameVSData && program.constantBufferHandles[1] && d.gl.uniform4fv(program.constantBufferHandles[1], d.perFrameVSData.data), device.perFramePSData && program.constantBufferHandles[2] && d.gl.uniform4fv(program.constantBufferHandles[2], d.perFramePSData.data), d.perObjectData && d.perObjectData.SetPerObjectDataToDevice(program.constantBufferHandles)
        }
    }, Tw2Effect.prototype.GetPassCount = function () {
        return null != this.effectRes && this.effectRes.IsGood() ? this.passes.length : 0
    }, Tw2Effect.prototype.GetPassInput = function (pass) {
        return null == this.effectRes || !this.effectRes.IsGood() || pass >= this.passes.length ? null : device.IsAlphaTestEnabled() && this.effectRes.passes[pass].shadowShaderProgram ? this.effectRes.passes[pass].shadowShaderProgram.input : this.effectRes.passes[pass].shaderProgram.input
    }, Tw2Effect.prototype.Render = function (cb) {
        for (var count = this.GetPassCount(), i = 0; count > i; ++i) this.ApplyPass(i), cb(this, i)
    }, Tw2MeshArea.batchType = Tw2GeometryBatch, Tw2MeshLineArea.batchType = Tw2GeometryLineBatch, Tw2Mesh.prototype.Initialize = function () {
        "" != this.geometryResPath && (this.geometryResource = resMan.GetResource(this.geometryResPath))
    }, Tw2Mesh.prototype._GetAreaBatches = function (areas, mode, accumulator, perObjectData) {
        for (var i = 0; i < areas.length; ++i) {
            var area = areas[i];
            if (null != area.effect && !area.debugIsHidden) {
                var batch = new area.constructor.batchType;
                batch.renderMode = mode, batch.perObjectData = perObjectData, batch.geometryRes = this.geometryResource, batch.meshIx = this.meshIndex, batch.start = area.index, batch.count = area.count, batch.effect = area.effect, accumulator.Commit(batch)
            }
        }
    }, Tw2Mesh.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        return null == this.geometryResource || this.debugIsHidden ? !1 : (mode == device.RM_OPAQUE ? this._GetAreaBatches(this.opaqueAreas, mode, accumulator, perObjectData) : mode == device.RM_DECAL ? this._GetAreaBatches(this.decalAreas, mode, accumulator, perObjectData) : mode == device.RM_TRANSPARENT ? this._GetAreaBatches(this.transparentAreas, mode, accumulator, perObjectData) : mode == device.RM_ADDITIVE && this._GetAreaBatches(this.additiveAreas, mode, accumulator, perObjectData), !0)
    }, Tw2Animation.prototype.IsFinished = function () {
        return !this.cycle && this.time >= this.duration
    }, Tw2AnimationController.prototype.SetGeometryResource = function (geometryResource) {
        this.models = [], this.animations = [], this.meshBindings = [];
        for (var i = 0; i < this.geometryResources.length; ++i) this.geometryResources[i].UnregisterNotification(this);
        this.loaded = !1, this.geometryResources = [], geometryResource && (this.geometryResources.push(geometryResource), geometryResource.RegisterNotification(this))
    }, Tw2AnimationController.prototype.AddGeometryResource = function (geometryResource) {
        for (var i = 0; i < this.geometryResources.length; ++i)
            if (this.geometryResources[i] == geometryResource) return;
        this.geometryResources.push(geometryResource), geometryResource.RegisterNotification(this)
    }, Tw2AnimationController.prototype.AddAnimationsFromRes = function (resource) {
        for (var i = 0; i < resource.animations.length; ++i) {
            for (var animation = null, j = 0; j < this.animations.length; ++j)
                if (this.animations[j].animationRes == resource.animations[i]) {
                    animation = this.animations[i];
                    break
                }
            animation || (animation = new Tw2Animation, animation.animationRes = resource.animations[i], this.animations.push(animation));
            for (var j = 0; j < animation.animationRes.trackGroups.length; ++j) {
                for (var found = !1, k = 0; k < animation.trackGroups.length; ++k)
                    if (animation.trackGroups[k].trackGroupRes == animation.animationRes.trackGroups[j]) {
                        found = !0;
                        break
                    }
                if (!found) {
                    for (var model = null, k = 0; k < this.models.length; ++k)
                        if (this.models[k].modelRes.name == animation.animationRes.trackGroups[j].name) {
                            model = this.models[k];
                            break
                        }
                    if (null != model) {
                        var group = new Tw2TrackGroup;
                        group.trackGroupRes = animation.animationRes.trackGroups[j];
                        for (var k = 0; k < group.trackGroupRes.transformTracks.length; ++k)
                            for (var m = 0; m < model.bones.length; ++m)
                                if (model.bones[m].boneRes.name == group.trackGroupRes.transformTracks[k].name) {
                                    var track = new Tw2Track;
                                    track.trackRes = group.trackGroupRes.transformTracks[k], track.bone = model.bones[m], group.transformTracks.push(track);
                                    break
                                }
                        animation.trackGroups.push(group)
                    }
                }
            }
        }
    }, Tw2AnimationController.prototype._AddModel = function (modelRes) {
        for (var i = 0; i < this.models.length; ++i)
            if (this.models[i].modelRes.name == modelRes.name) return null;
        var model = new Tw2Model;
        model.modelRes = modelRes;
        var skeleton = modelRes.skeleton;
        if (null != skeleton)
            for (var j = 0; j < skeleton.bones.length; ++j) {
                var bone = new Tw2Bone;
                bone.boneRes = skeleton.bones[j], model.bones.push(bone), model.bonesByName[bone.boneRes.name] = bone
            }
        return this.models.push(model), model
    }, Tw2AnimationController.prototype._FindMeshBindings = function (resource) {
        for (var i = 0; i < this.meshBindings.length; ++i)
            if (this.meshBindings[i].resource == resource) return this.meshBindings[i];
        return null
    }, Tw2AnimationController.prototype.RebuildCachedData = function (resource) {
        for (var found = !1, i = 0; i < this.geometryResources.length; ++i)
            if (this.geometryResources[i] == resource) {
                found = !0;
                break
            }
        if (found) {
            for (var i = 0; i < this.geometryResources.length; ++i)
                if (!this.geometryResources[i].IsGood()) return;
            for (var i = 0; i < this.geometryResources.length; ++i) this._DoRebuildCachedData(this.geometryResources[i])
        }
    }, Tw2AnimationController.prototype._DoRebuildCachedData = function (resource) {
        for (var newModels = [], i = 0; i < resource.models.length; ++i) {
            var model = this._AddModel(resource.models[i]);
            model && newModels.push(model)
        }
        for (var i = 0; i < this.geometryResources.length; ++i) this.AddAnimationsFromRes(this.geometryResources[i], this.models);
        if (0 == resource.models.length) {
            for (var i = 0; i < resource.meshes.length; ++i) Tw2GeometryRes.BindMeshToModel(resource.meshes[i], this.geometryResources[0].models[0]);
            resource.models.push(this.geometryResources[0].models[0])
        }
        for (var i = 0; i < resource.models.length; ++i) {
            for (var model = null, j = 0; j < this.models.length; ++j)
                if (this.models[j].modelRes.name == resource.models[i].name) {
                    model = this.models[j];
                    break
                }
            if (null != model)
                for (var j = 0; j < resource.models[i].meshBindings.length; ++j) {
                    var meshIx = resource.meshes.indexOf(resource.models[i].meshBindings[j].mesh),
                        meshBindings = this._FindMeshBindings(resource);
                    null == meshBindings && (meshBindings = [], meshBindings.resource = resource, this.meshBindings.push(meshBindings)), meshBindings[meshIx] = new glMatrixArrayType(12 * resource.models[i].meshBindings[j].bones.length);
                    for (var k = 0; k < resource.models[i].meshBindings[j].bones.length; ++k)
                        for (var n = 0; n < model.bones.length; ++n)
                            if (model.bones[n].boneRes.name == resource.models[i].meshBindings[j].bones[k].name) {
                                model.bones[n].bindingArrays || (model.bones[n].bindingArrays = []);
                                var arrayInfo = {
                                    array: meshBindings[meshIx],
                                    offset: 12 * k
                                };
                                model.bones[n].bindingArrays[model.bones[n].bindingArrays.length] = arrayInfo;
                                break
                            }
                }
        }
        if (resource.meshes.length && resource.models.length && this.ResetBoneTransforms(resource.models), this.loaded = !0, this.animations.length) {
            if (this.pendingCommands)
                for (var i = 0; i < this.pendingCommands.length; ++i) this.pendingCommands[i].func.apply(this, this.pendingCommands[i].args);
            this.pendingCommands = null
        }
    }, Tw2AnimationController.prototype.PlayAnimation = function (name, cycle, callback) {
        if (0 == this.animations.length) return this.pendingCommands || (this.pendingCommands = []), void this.pendingCommands.push({
            func: this.PlayAnimation,
            args: [name, cycle, callback]
        });
        for (var i = 0; i < this.animations.length; ++i) this.animations[i].animationRes.name == name && (this.animations[i].time = 0, this.animations[i].isPlaying = !0, "undefined" != typeof cycle && (this.animations[i].cycle = cycle), "undefined" != typeof callback && (this.animations[i].callback = callback))
    }, Tw2AnimationController.prototype.StopAnimation = function (name) {
        for (var i = 0; i < this.animations.length; ++i) this.animations[i].animationRes.name == name && (this.animations[i].isPlaying = !1)
    }, Tw2AnimationController.prototype.StopAllAnimations = function () {
        for (var i = 0; i < this.animations.length; ++i) this.animations[i].isPlaying = !1
    }, Tw2AnimationController.prototype.ResetBoneTransforms = function () {
        for (var i = 0; i < this.models.length; ++i)
            for (var j = 0; j < this.models[i].bones.length; ++j) {
                var bone = this.models[i].bones[j],
                    boneRes = bone.boneRes;
                mat4.set(boneRes.localTransform, bone.localTransform), -1 != boneRes.parentIndex ? mat4.multiply(bone.localTransform, this.models[i].bones[bone.boneRes.parentIndex].worldTransform, bone.worldTransform) : mat4.set(bone.localTransform, bone.worldTransform), mat4.identity(bone.offsetTransform)
            }
        for (var id = mat4.identity(mat4.create()), i = 0; i < this.meshBindings.length; ++i)
            for (var j = 0; j < this.meshBindings[i].length; ++j)
                for (var k = 0; 16 * k < this.meshBindings[i][j].length; ++k)
                    for (var m = 0; 16 > m; ++m) this.meshBindings[i][j][16 * k + m] = id[m]
    }, Tw2AnimationController.EvaluateCurve = function (curve, time, value, cycle, duration) {
        for (var count = curve.knots.length, knot = count - 1, t = 0, i = 0; i < curve.knots.length; ++i)
            if (curve.knots[i] > time) {
                knot = i;
                break
            }
        if (0 == curve.degree)
            for (var i = 0; i < curve.dimension; ++i) value[i] = curve.controls[knot * curve.dimension + i];
        else if (1 == curve.degree) {
            var knot0 = cycle ? (knot + count - 1) % count : 0 == knot ? 0 : knot - 1,
                dt = curve.knots[knot] - curve.knots[knot0];
            0 > dt && (dt += duration), dt > 0 && (t = (time - curve.knots[i - 1]) / dt);
            for (var i = 0; i < curve.dimension; ++i) value[i] = curve.controls[knot0 * curve.dimension + i] * (1 - t) + curve.controls[knot * curve.dimension + i] * t
        } else {
            var k_2 = cycle ? (knot + count - 2) % count : 0 == knot ? 0 : knot - 2,
                k_1 = cycle ? (knot + count - 1) % count : 0 == knot ? 0 : knot - 1,
                p1 = k_2 * curve.dimension,
                p2 = k_1 * curve.dimension,
                p3 = knot * curve.dimension,
                ti_2 = curve.knots[k_2],
                ti_1 = curve.knots[k_1],
                ti = curve.knots[knot],
                ti1 = curve.knots[(knot + 1) % count];
            ti_2 > ti && (ti += duration, ti1 += duration, time += duration), ti_1 > ti && (ti += duration, ti1 += duration, time += duration), ti > ti1 && (ti1 += duration);
            var tmti_1 = time - ti_1,
                tmti_2 = time - ti_2,
                dL0 = ti - ti_1,
                dL1_1 = ti - ti_2,
                dL1_2 = ti1 - ti_1,
                L0 = tmti_1 / dL0,
                L1_1 = tmti_2 / dL1_1,
                L1_2 = tmti_1 / dL1_2,
                ci_2 = L1_1 + L0 - L0 * L1_1,
                ci = L0 * L1_2,
                ci_1 = ci_2 - ci;
            ci_2 = 1 - ci_2;
            for (var i = 0; i < curve.dimension; ++i) value[i] = ci_2 * curve.controls[p1 + i] + ci_1 * curve.controls[p2 + i] + ci * curve.controls[p3 + i]
        }
    }, Tw2AnimationController.prototype.Update = function (dt) {
        if (null != this.models && this.update) {
            for (var i = 0; i < this.geometryResources.length; ++i) this.geometryResources[i].KeepAlive();
            for (var tempMat = this._tempMat4, updateBones = !1, i = 0; i < this.animations.length; ++i) {
                var animation = this.animations[i];
                if (animation.isPlaying) {
                    var res = animation.animationRes;
                    animation.time += dt * animation.timeScale, animation.time > res.duration && (null != animation.callback && animation.callback(this, animation), animation.cycle ? animation.time = animation.time % res.duration : (animation.isPlaying = !1, animation.time = res.duration));
                    for (var orientation = this._tempQuat4, scale = this._tempMat3, position = this._tempVec3, j = 0; j < animation.trackGroups.length; ++j)
                        for (var k = 0; k < animation.trackGroups[j].transformTracks.length; ++k) {
                            var track = animation.trackGroups[j].transformTracks[k];
                            track.trackRes.position ? Tw2AnimationController.EvaluateCurve(track.trackRes.position, animation.time, position, animation.cycle, res.duration) : position[0] = position[1] = position[2] = 0, track.trackRes.orientation ? (Tw2AnimationController.EvaluateCurve(track.trackRes.orientation, animation.time, orientation, animation.cycle, res.duration), quat4.normalize(orientation)) : (orientation[0] = orientation[1] = orientation[2] = 0, orientation[3] = 1), track.trackRes.scaleShear ? Tw2AnimationController.EvaluateCurve(track.trackRes.scaleShear, animation.time, scale, animation.cycle, res.duration) : mat3.identity(scale), mat3.toMat4(scale, track.bone.localTransform), mat4.multiply(track.bone.localTransform, mat4.transpose(quat4.toMat4(orientation, tempMat))), track.bone.localTransform[12] = position[0], track.bone.localTransform[13] = position[1], track.bone.localTransform[14] = position[2], updateBones = !0
                        }
                }
            }
            for (var i = 0; i < this.models.length; ++i)
                for (var j = 0; j < this.models[i].bones.length; ++j) {
                    var bone = this.models[i].bones[j];
                    if (-1 != bone.boneRes.parentIndex ? mat4.multiply(this.models[i].bones[bone.boneRes.parentIndex].worldTransform, bone.localTransform, bone.worldTransform) : mat4.set(bone.localTransform, bone.worldTransform), mat4.multiply(bone.worldTransform, bone.boneRes.worldTransformInv, bone.offsetTransform), bone.bindingArrays)
                        for (var a = 0; a < bone.bindingArrays.length; ++a) bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 0] = bone.offsetTransform[0], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 1] = bone.offsetTransform[4], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 2] = bone.offsetTransform[8], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 3] = bone.offsetTransform[12], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 4] = bone.offsetTransform[1], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 5] = bone.offsetTransform[5], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 6] = bone.offsetTransform[9], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 7] = bone.offsetTransform[13], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 8] = bone.offsetTransform[2], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 9] = bone.offsetTransform[6], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 10] = bone.offsetTransform[10], bone.bindingArrays[a].array[bone.bindingArrays[a].offset + 11] = bone.offsetTransform[14]
                }
        }
    }, Tw2AnimationController.prototype.RenderDebugInfo = function (debugHelper) {
        for (var i = 0; i < this.models.length; ++i)
            for (var j = 0; j < this.models[i].bones.length; ++j) {
                var b0 = this.models[i].bones[j];
                if (b0.boneRes.parentIndex >= 0) {
                    var b1 = this.models[i].bones[b0.boneRes.parentIndex];
                    debugHelper.AddLine([b0.worldTransform[12], b0.worldTransform[13], b0.worldTransform[14]], [b1.worldTransform[12], b1.worldTransform[13], b1.worldTransform[14]])
                }
            }
    }, Tw2AnimationController.prototype.GetBoneMatrixes = function (meshIndex, geometryResource) {
        if (0 == this.geometryResources.length) return new Float32Array;
        "undefined" == typeof geometryResource && (geometryResource = this.geometryResources[0]);
        var meshBindings = this._FindMeshBindings(geometryResource);
        return meshBindings && meshIndex < meshBindings.length ? meshBindings[meshIndex] : new Float32Array
    }, Tw2AnimationController.prototype.FindModelForMesh = function (meshIndex, geometryResource) {
        if (0 == this.geometryResources.length) return null;
        if ("undefined" == typeof geometryResource && (geometryResource = this.geometryResources[0]), !geometryResource.IsGood()) return null;
        for (var mesh = geometryResource.meshes[meshIndex], i = 0; i < this.models.length; ++i)
            for (var j = 0; j < this.models[i].modelRes.meshBindings.length; ++i)
                if (this.models[i].modelRes.meshBindings[j].mesh == mesh) return this.models[i];
        return null
    }, Tw2RenderTarget.prototype.Destroy = function () {
        this.texture && (device.gl.deleteTexture(this.texture.texture), this.texture = null), this._renderBuffer && (device.gl.deleteRenderbuffer(this._renderBuffer), this._renderBuffer = null), this._frameBuffer && (device.gl.deleteFramebuffer(this._frameBuffer), this._frameBuffer = null)
    }, Tw2RenderTarget.prototype.Create = function (width, height, hasDepth) {
        this.Destroy(), this.texture = new Tw2TextureRes, this.texture.Attach(device.gl.createTexture()), this._frameBuffer = device.gl.createFramebuffer(), device.gl.bindFramebuffer(device.gl.FRAMEBUFFER, this._frameBuffer), device.gl.bindTexture(device.gl.TEXTURE_2D, this.texture.texture), device.gl.texImage2D(device.gl.TEXTURE_2D, 0, device.gl.RGBA, width, height, 0, device.gl.RGBA, device.gl.UNSIGNED_BYTE, null), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_MAG_FILTER, device.gl.LINEAR), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_MIN_FILTER, device.gl.LINEAR), device.gl.bindTexture(device.gl.TEXTURE_2D, null), this._renderBuffer = null, hasDepth && (this._renderBuffer = device.gl.createRenderbuffer(), device.gl.bindRenderbuffer(device.gl.RENDERBUFFER, this._renderBuffer), device.gl.renderbufferStorage(device.gl.RENDERBUFFER, device.gl.DEPTH_COMPONENT16, width, height)), device.gl.framebufferTexture2D(device.gl.FRAMEBUFFER, device.gl.COLOR_ATTACHMENT0, device.gl.TEXTURE_2D, this.texture.texture, 0), hasDepth && device.gl.framebufferRenderbuffer(device.gl.FRAMEBUFFER, device.gl.DEPTH_ATTACHMENT, device.gl.RENDERBUFFER, this._renderBuffer), device.gl.bindRenderbuffer(device.gl.RENDERBUFFER, null), device.gl.bindFramebuffer(device.gl.FRAMEBUFFER, null), this.width = width, this.height = height, this.hasDepth = hasDepth
    }, Tw2RenderTarget.prototype.Set = function () {
        device.gl.bindFramebuffer(device.gl.FRAMEBUFFER, this._frameBuffer), device.gl.viewport(0, 0, this.width, this.height)
    }, Tw2RenderTarget.prototype.Unset = function () {
        device.gl.bindFramebuffer(device.gl.FRAMEBUFFER, null), device.gl.viewport(0, 0, device.viewportWidth, device.viewportHeight)
    }, Tw2CurveSet.prototype.Initialize = function () {
        this.playOnLoad && this.Play()
    }, Tw2CurveSet.prototype.Play = function () {
        this.isPlaying = !0, this.scaledTime = 0
    }, Tw2CurveSet.prototype.PlayFrom = function (time) {
        this.isPlaying = !0, this.scaledTime = time
    }, Tw2CurveSet.prototype.Stop = function () {
        this.isPlaying = !1
    }, Tw2CurveSet.prototype.Update = function (dt) {
        if (this.isPlaying) {
            this.scaledTime += dt * this.scale;
            for (var scaledTime = this.scaledTime, curves = this.curves, i = 0; i < curves.length; ++i) curves[i].UpdateValue(scaledTime);
            for (var bindings = this.bindings, i = 0; i < bindings.length; ++i) bindings[i].CopyValue()
        }
    }, Tw2CurveSet.prototype.GetMaxCurveDuration = function () {
        for (var length = 0, i = 0; i < this.curves.length; ++i) "GetLength" in this.curves[i] && (length = Math.max(length, this.curves[i].GetLength()));
        return length
    }, Tw2ValueBinding.prototype.Initialize = function () {
        if (this.sourceObject && "" != this.sourceAttribute && this.destinationObject && "" != this.destinationAttribute) {
            var srcSwizzled = !1;
            this._sourceElement = 0;
            var destSwizzled = !1;
            this._destinationElement = 0;
            var srcSwizzle = this.sourceAttribute.substr(-2);
            ".x" == srcSwizzle || ".r" == srcSwizzle ? (srcSwizzled = !0, this._sourceElement = 0, this.sourceAttribute = this.sourceAttribute.substr(0, this.sourceAttribute.length - 2)) : ".y" == srcSwizzle || ".g" == srcSwizzle ? (srcSwizzled = !0, this._sourceElement = 1, this.sourceAttribute = this.sourceAttribute.substr(0, this.sourceAttribute.length - 2)) : ".z" == srcSwizzle || ".b" == srcSwizzle ? (srcSwizzled = !0, this._sourceElement = 2, this.sourceAttribute = this.sourceAttribute.substr(0, this.sourceAttribute.length - 2)) : ".w" == srcSwizzle || ".a" == srcSwizzle ? (srcSwizzled = !0, this._sourceElement = 3, this.sourceAttribute = this.sourceAttribute.substr(0, this.sourceAttribute.length - 2)) : this.sourceObject.constructor == (new Tw2Vector4Parameter).constructor && ("v1" == this.sourceAttribute ? (srcIsArray = !0, srcSwizzled = !0, this._sourceElement = 0, this.sourceAttribute = "value") : "v2" == this.sourceAttribute ? (srcIsArray = !0, srcSwizzled = !0, this._sourceElement = 1, this.sourceAttribute = "value") : "v3" == this.sourceAttribute ? (srcIsArray = !0, srcSwizzled = !0, this._sourceElement = 2, this.sourceAttribute = "value") : "v4" == this.sourceAttribute && (srcIsArray = !0, srcSwizzled = !0, this._sourceElement = 3, this.sourceAttribute = "value"));
            var destSwizzle = this.destinationAttribute.substr(-2);
            if (".x" == destSwizzle || ".r" == destSwizzle ? (destSwizzled = !0, this._destinationElement = 0, this.destinationAttribute = this.destinationAttribute.substr(0, this.destinationAttribute.length - 2)) : ".y" == destSwizzle || ".g" == destSwizzle ? (destSwizzled = !0, this._destinationElement = 1, this.destinationAttribute = this.destinationAttribute.substr(0, this.destinationAttribute.length - 2)) : ".z" == destSwizzle || ".b" == destSwizzle ? (destSwizzled = !0, this._destinationElement = 2, this.destinationAttribute = this.destinationAttribute.substr(0, this.destinationAttribute.length - 2)) : ".w" == destSwizzle || ".a" == destSwizzle ? (destSwizzled = !0, this._destinationElement = 3, this.destinationAttribute = this.destinationAttribute.substr(0, this.destinationAttribute.length - 2)) : this.destinationObject.constructor == (new Tw2Vector4Parameter).constructor && ("v1" == this.destinationAttribute ? (destIsArray = !0, destSwizzled = !0, this._destinationElement = 0, this.destinationAttribute = "value") : "v2" == this.destinationAttribute ? (destIsArray = !0, destSwizzled = !0, this._destinationElement = 1, this.destinationAttribute = "value") : "v3" == this.destinationAttribute ? (destIsArray = !0, destSwizzled = !0, this._destinationElement = 2, this.destinationAttribute = "value") : "v4" == this.destinationAttribute && (destIsArray = !0, destSwizzled = !0, this._destinationElement = 3, this.destinationAttribute = "value")), this.sourceAttribute in this.sourceObject && this.destinationAttribute in this.destinationObject) {
                var srcIsArray = this.sourceObject[this.sourceAttribute].constructor == (new Float32Array).constructor,
                    destIsArray = this.destinationObject[this.destinationAttribute].constructor == (new Float32Array).constructor;
                if (srcIsArray == destIsArray && typeof this.sourceObject[this.sourceAttribute] == typeof this.destinationObject[this.destinationAttribute])
                    if (srcIsArray)
                        if (srcSwizzled) this._copyFunc = destSwizzled ? this._CopyElementToElement : this._ReplicateElement;
                        else if (this.sourceObject[this.sourceAttribute].length <= this.destinationObject[this.destinationAttribute].length) this._copyFunc = this._CopyArray;
                        else {
                            if (16 != this.sourceObject[this.sourceAttribute].length) return;
                            this._copyFunc = this._ExtractPos
                        } else this._copyFunc = this._CopyValueToValue;
                else if (srcIsArray && srcSwizzled && "number" == typeof this.destinationObject[this.destinationAttribute]) this._copyFunc = this._CopyElementToValue;
                else if (destIsArray && "number" == typeof this.sourceObject[this.sourceAttribute]) this._copyFunc = destSwizzled ? this._CopyValueToElement : this._ReplicateValue;
                else {
                    if ("number" != typeof this.sourceObject[this.sourceAttribute] || "boolean" != typeof this.destinationObject[this.destinationAttribute]) return;
                    this._copyFunc = this._CopyFloatToBoolean
                }
            }
        }
    }, Tw2ValueBinding.prototype.CopyValue = function () {
        this._copyFunc && (this._copyFunc.call(this), "OnValueChanged" in this.destinationObject && this.destinationObject.OnValueChanged())
    }, Tw2ValueBinding.prototype._CopyValueToValue = function () {
        this.destinationObject[this.destinationAttribute] = this.sourceObject[this.sourceAttribute] * this.scale + this.offset[0]
    }, Tw2ValueBinding.prototype._CopyArray = function () {
        for (var count = Math.min(this.destinationObject[this.destinationAttribute].length, this.sourceObject[this.sourceAttribute].length), i = 0; count > i; ++i) this.destinationObject[this.destinationAttribute][i] = this.sourceObject[this.sourceAttribute][i] * this.scale + this.offset[i]
    }, Tw2ValueBinding.prototype._CopyElementToElement = function () {
        this.destinationObject[this.destinationAttribute][this._destinationElement] = this.sourceObject[this.sourceAttribute][this._sourceElement] * this.scale + this.offset[0]
    }, Tw2ValueBinding.prototype._ReplicateValue = function () {
        for (var i = 0; i < this.destinationObject[this.destinationAttribute].length; ++i) this.destinationObject[this.destinationAttribute][i] = this.sourceObject[this.sourceAttribute] * this.scale + this.offset[i]
    }, Tw2ValueBinding.prototype._ReplicateElement = function () {
        for (var i = 0; i < this.destinationObject[this.destinationAttribute].length; ++i) this.destinationObject[this.destinationAttribute][i] = this.sourceObject[this.sourceAttribute][this._sourceElement] * this.scale + this.offset[i]
    }, Tw2ValueBinding.prototype._ExtractPos = function () {
        for (var i = 0; i < this.destinationObject[this.destinationAttribute].length; ++i) this.destinationObject[this.destinationAttribute][i] = this.sourceObject[this.sourceAttribute][i + 12] * this.scale + this.offset[i]
    }, Tw2ValueBinding.prototype._CopyElementToValue = function () {
        this.destinationObject[this.destinationAttribute] = this.sourceObject[this.sourceAttribute][this._sourceElement] * this.scale + this.offset[0]
    }, Tw2ValueBinding.prototype._CopyValueToElement = function () {
        this.destinationObject[this.destinationAttribute][this._destinationElement] = this.sourceObject[this.sourceAttribute] * this.scale + this.offset[0]
    }, Tw2ValueBinding.prototype._CopyFloatToBoolean = function () {
        this.destinationObject[this.destinationAttribute] = 0 != this.sourceObject[this.sourceAttribute]
    }, Tw2PostProcess.prototype.Render = function () {
        var width = device.viewportWidth,
            height = device.viewportHeight;
        if (!(0 >= width || 0 >= height)) {
            if (null == this.texture && (this.texture = new Tw2TextureRes, this.texture.Attach(device.gl.createTexture())), width != this.width || height != this.height) {
                device.gl.bindTexture(device.gl.TEXTURE_2D, this.texture.texture), device.gl.texImage2D(device.gl.TEXTURE_2D, 0, device.gl.RGBA, width, height, 0, device.gl.RGBA, device.gl.UNSIGNED_BYTE, null), device.gl.bindTexture(device.gl.TEXTURE_2D, null), this.quadRT0.Create(width / 4, height / 4, !1), this.quadRT1.Create(width / 4, height / 4, !1), this.width = width, this.height = height;
                for (var i = 0; i < this.steps.length; ++i) {
                    var step = this.steps[i];
                    for (var name in step.inputs) step.effect.parameters[name].textureRes = step.inputs[name] ? step.inputs[name].texture : this.texture;
                    if ("g_texelSize" in step.effect.parameters && "BlitCurrent" in step.inputs) {
                        var size = step.effect.parameters.g_texelSize,
                            rt = step.inputs.BlitCurrent;
                        rt ? (size.value[0] = 1 / rt.width, size.value[1] = 1 / rt.width) : (size.value[0] = 1 / width, size.value[1] = 1 / width), size.OnValueChanged()
                    }
                }
            }
            device.gl.bindTexture(device.gl.TEXTURE_2D, this.texture.texture), device.gl.copyTexImage2D(device.gl.TEXTURE_2D, 0, device.alphaBlendBackBuffer ? device.gl.RGBA : device.gl.RGB, 0, 0, width, height, 0), device.gl.bindTexture(device.gl.TEXTURE_2D, null), device.SetStandardStates(device.RM_OPAQUE);
            for (var i = 0; i < this.steps.length; ++i) {
                var step = this.steps[i];
                null != step.rt ? step.rt.Set() : (device.gl.bindFramebuffer(device.gl.FRAMEBUFFER, null), device.gl.viewport(0, 0, width, height)), device.RenderFullScreenQuad(step.effect)
            }
        }
    }, Tw2ColorCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2ColorCurve.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2ColorCurve.prototype.GetValueAt = function (t, value) {
        if (0 == this.length) return value[0] = this.value[0], value[1] = this.value[1], value[2] = this.value[2], value[3] = this.value[3], value;
        var firstKey = this.keys[0],
            lastKey = this.keys[this.keys.length - 1];
        if (t >= lastKey.time) {
            if (0 == this.extrapolation) return value[0] = this.value[0], value[1] = this.value[1], value[2] = this.value[2], value[3] = this.value[3], value;
            if (1 == this.extrapolation) return value[0] = lastKey.value[0], value[1] = lastKey.value[1], value[2] = lastKey.value[2], value[3] = lastKey.value[3], value;
            if (2 == this.extrapolation) {
                var d = t - lastKey.time;
                return value[0] = lastKey.value[0] + d * lastKey.right[0], value[1] = lastKey.value[1] + d * lastKey.right[1], value[2] = lastKey.value[2] + d * lastKey.right[2], value[3] = lastKey.value[3] + d * lastKey.right[3], value
            }
            t %= lastKey.time
        } else if (0 > t || t < firstKey.time) {
            if (0 == this.extrapolation) return value[0] = this.value[0], value[1] = this.value[1], value[2] = this.value[2], value[3] = this.value[3], value;
            if (2 == this.extrapolation) {
                var d = t * this.length - lastKey.time;
                return value[0] = firstKey.value[0] + d * firstKey.left[0], value[1] = firstKey.value[1] + d * firstKey.left[1], value[2] = firstKey.value[2] + d * firstKey.left[2], value[3] = firstKey.value[3] + d * firstKey.left[3], value
            }
            return value[0] = firstKey.value[0], value[1] = firstKey.value[1], value[2] = firstKey.value[2], value[3] = firstKey.value[3], value
        }
        for (var ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1]; t >= ck.time || t < ck_1.time;) t < ck_1.time && (this._currKey = 0), this._currKey++, ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1];
        var nt = (t - ck_1.time) / (ck.time - ck_1.time);
        return 1 == ck_1.interpolation ? (value[0] = ck_1.value[0], value[1] = ck_1.value[1], value[2] = ck_1.value[2], value[3] = ck_1.value[3]) : (value[0] = ck_1.value[0] * (1 - nt) + ck.value[0] * nt, value[1] = ck_1.value[1] * (1 - nt) + ck.value[1] * nt, value[2] = ck_1.value[2] * (1 - nt) + ck.value[2] * nt, value[3] = ck_1.value[3] * (1 - nt) + ck.value[3] * nt), value
    }, Tw2ColorCurve2.prototype.Initialize = function () {
        this.Sort()
    }, Tw2ColorCurve2.prototype.GetLength = function () {
        return this.length
    }, Tw2ColorCurve2.Compare = function (a, b) {
        return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    }, Tw2ColorCurve2.prototype.Sort = function () {
        if (this.keys.length) {
            this.keys.sort(Tw2ColorCurve2.Compare);
            var back = this.keys[this.keys.length - 1];
            if (back.time > this.length) {
                var preLength = this.length,
                    endValue = this.endValue,
                    endTangent = this.endTangent;
                this.length = back.time, this.endValue = back.value, this.endTangent = back.leftTangent, preLength > 0 && (back.time = preLength, back.value = endValue, back.leftTangent = endTangent)
            }
        }
    }, Tw2ColorCurve2.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.currentValue)
    }, Tw2ColorCurve2.prototype.GetValueAt = function (time, value) {
        if (time = time / this.timeScale + this.timeOffset, this.length <= 0 || 0 >= time) return value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value[3] = this.startValue[3], value;
        if (time > this.length) {
            if (!this.cycle) return this.reversed ? (value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value[3] = this.startValue[3], value) : (value[0] = this.endValue[0], value[1] = this.endValue[1], value[2] = this.endValue[2], value[3] = this.endValue[3], value);
            time %= this.length
        }
        if (this.reversed && (time = this.length - time), 0 == this.keys.length) return this.Interpolate(time, null, null, value);
        var startKey = this.keys[0];
        if (time <= startKey.time) return this.Interpolate(time, null, startKey, value);
        if (time >= this.keys[this.keys.length - 1].time) return this.Interpolate(time, this.keys[this.keys.length - 1], null, value);
        for (var endKey = this.keys[i + 1], i = 0; i + 1 < this.keys.length && (startKey = this.keys[i], endKey = this.keys[i + 1], !(startKey.time <= time && endKey.time > time)); ++i);
        return this.Interpolate(time, startKey, endKey, value)
    }, Tw2ColorCurve2.prototype.Interpolate = function (time, lastKey, nextKey, value) {
        value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value[3] = this.startValue[3];
        var startValue = this.startValue,
            endValue = this.endValue,
            interp = this.interpolation,
            deltaTime = this.length;
        switch (null != lastKey && (interp = lastKey.interpolation, time -= lastKey.time), interp) {
            case 1:
                return lastKey && nextKey ? (startValue = lastKey.value, endValue = nextKey.value, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, deltaTime = this.length - lastKey.time), value[0] = startValue[0] + (endValue[0] - startValue[0]) * (time / deltaTime), value[1] = startValue[1] + (endValue[1] - startValue[1]) * (time / deltaTime), value[2] = startValue[2] + (endValue[2] - startValue[2]) * (time / deltaTime), value[3] = startValue[3] + (endValue[3] - startValue[3]) * (time / deltaTime), value
        }
        return value
    }, Tw2ColorSequencer.prototype.GetLength = function () {
        for (var length = 0, i = 0; i < this.functions.length; ++i) "GetLength" in this.functions[i] && (length = Math.max(length, this.functions[i].GetLength()));
        return length
    }, Tw2ColorSequencer.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2ColorSequencer.prototype.GetValueAt = function (t, value) {
        if (0 == this.operator) {
            value[0] = 1, value[1] = 1, value[2] = 1, value[3] = 1;
            for (var tempValue = this._tempValue, functions = this.functions, i = 0; i < functions.length; ++i) functions[i].GetValueAt(t, tempValue), value[0] *= tempValue[0], value[1] *= tempValue[1], value[2] *= tempValue[2], value[3] *= tempValue[3]
        } else {
            value[0] = 0, value[1] = 0, value[2] = 0, value[3] = 0;
            for (var tempValue = this._tempValue, functions = this.functions, i = 0; i < functions.length; ++i) functions[i].GetValueAt(t, tempValue), value[0] += tempValue[0], value[1] += tempValue[1], value[2] += tempValue[2], value[3] += tempValue[3]
        }
        return value
    }, Tw2EulerRotation.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.currentValue)
    }, Tw2EulerRotation.prototype.GetValueAt = function (t, value) {
        var yaw = this.yawCurve ? this.yawCurve.GetValueAt(t) : 0,
            pitch = this.pitchCurve ? this.pitchCurve.GetValueAt(t) : 0,
            roll = this.rollCurve ? this.rollCurve.GetValueAt(t) : 0,
            sinYaw = Math.sin(yaw / 2),
            cosYaw = Math.cos(yaw / 2),
            sinPitch = Math.sin(pitch / 2),
            cosPitch = Math.cos(pitch / 2),
            sinRoll = Math.sin(roll / 2),
            cosRoll = Math.cos(roll / 2);
        return value[0] = sinYaw * cosPitch * sinRoll + cosYaw * sinPitch * cosRoll, value[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll, value[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll, value[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll, value
    }, Tw2EulerRotation.prototype.GetLength = function () {
        var length = 0;
        return this.yawCurve && "GetLength" in this.yawCurve && (length = this.yawCurve.GetLength()), this.pitchCurve && "GetLength" in this.pitchCurve && (length = Math.max(length, this.pitchCurve.GetLength())), this.rollCurve && "GetLength" in this.rollCurve && (length = Math.max(length, this.rollCurve.GetLength())), length
    }, Tw2EventCurve.KeySort = function (a, b) {
        return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    }, Tw2EventCurve.prototype.Initialize = function () {
        this.keys.sort(Tw2EventCurve.KeySort), this._length = 0, this.keys.length && (this._length = this.keys[this.keys.length - 1].time)
    }, Tw2EventCurve.prototype.GetLength = function () {
        return this._length
    }, Tw2EventCurve.prototype.UpdateValue = function (t) {
        if (!(this._length <= 0)) {
            var before = this._time;
            if (this._time = t, this._time < before && (this._currentKey = 0), 3 == this.extrapolation) {
                var now = this._time % this._length;
                before > now && (this._currentKey = 0), this._time = now
            }
            for (; this._currentKey < this.keys.length && this._time >= this.keys[this._currentKey].time;) this.value = this.keys[this._currentKey].value, ++this._currentKey
        }
    };
    var Perlin_start = !0,
        Perlin_B = 256,
        Perlin_BM = 255,
        Perlin_N = 4096,
        Perlin_p = new Array(Perlin_B + Perlin_B + 2),
        Perlin_g1 = new Array(Perlin_B + Perlin_B + 2);
    Tw2PerlinCurve.prototype.UpdateValue = function (t) {
        this.value = this.GetValueAt(t)
    }, Tw2PerlinCurve.prototype.GetValueAt = function (t) {
        return t -= this._startOffset, (PerlinNoise1D(t * this.speed, this.alpha, this.beta, this.N) + 1) / 2 * this.scale + this.offset
    }, Tw2QuaternionSequencer.prototype.GetLength = function () {
        for (var length = 0, i = 0; i < this.functions.length; ++i) "GetLength" in this.functions[i] && (length = Math.max(length, this.functions[i].GetLength()));
        return length
    }, Tw2QuaternionSequencer.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2QuaternionSequencer.prototype.GetValueAt = function (t, value) {
        value[0] = 0, value[1] = 0, value[2] = 0, value[3] = 1;
        for (var tempValue = this._tempValue, functions = this.functions, i = 0; i < functions.length; ++i) functions[i].GetValueAt(t, tempValue), quat4.multiply(value, tempValue);
        return value
    }, Tw2RandomConstantCurve.prototype.UpdateValue = function (t) {
        this.value = this.GetValueAt(t)
    }, Tw2RandomConstantCurve.prototype.GetValueAt = function () {
        return this.hold || (this.value = this.min + (this.max - this.min) * Math.random()), this.value
    }, Tw2RGBAScalarSequencer.prototype.GetLength = function () {
        var length = 0;
        return this.RedCurve && "GetLength" in this.RedCurve && (length = this.RedCurve.GetLength()), this.GreenCurve && "GetLength" in this.GreenCurve && (length = Math.max(length, this.GreenCurve.GetLength())), this.BlueCurve && "GetLength" in this.BlueCurve && (length = Math.max(length, this.BlueCurve.GetLength())), this.AlphaCurve && "GetLength" in this.AlphaCurve && (length = Math.max(length, this.AlphaCurve.GetLength())), length
    }, Tw2RGBAScalarSequencer.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2RGBAScalarSequencer.prototype.GetValueAt = function (t, value) {
        return value[0] = this.RedCurve ? this.RedCurve.GetValueAt(t) : 0, value[1] = this.GreenCurve ? this.GreenCurve.GetValueAt(t) : 0, value[2] = this.BlueCurve ? this.BlueCurve.GetValueAt(t) : 0, value[3] = this.AlphaCurve ? this.AlphaCurve.GetValueAt(t) : 0, value
    }, Tw2RigidOrientation.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2RigidOrientation.prototype.ExponentialDecay = function (v, a, m, k, t) {
        return a * t / k + m * (v * k - a) / (k * k) * (1 - Math.pow(Math.E, -k * t / m))
    }, Tw2RigidOrientation.prototype.GetValueAt = function (t, value) {
        if (0 == this.states.length || 0 > t || t < this.states[0].time) return quat4.set(this.value, value), value;
        var key = 0;
        if (t >= this.states[this.states.length - 1].time) key = this.states.length - 1;
        else
            for (; key + 1 < this.states.length && !(t >= this.states[key].time && t < this.states[key + 1].time); ++key);
        t -= this.states[key].time, this._tau[0] = ExponentialDecay(this.states[key].omega0[0], this.states[key].torque[0], this.I, this.drag, t), this._tau[1] = ExponentialDecay(this.states[key].omega0[1], this.states[key].torque[1], this.I, this.drag, t), this._tau[2] = ExponentialDecay(this.states[key].omega0[2], this.states[key].torque[2], this.I, this.drag, t), vec3.set(this._tau, this._tauConverter), this._tauConverter[3] = 0;
        var norm = Math.sqrt(this._tauConverter[0] * this._tauConverter[0] + this._tauConverter[1] * this._tauConverter[1] + this._tauConverter[2] * this._tauConverter[2] + this._tauConverter[3] * this._tauConverter[3]);
        return norm ? (this._tauConverter[0] = Math.sin(norm) * this._tauConverter[0] / norm, this._tauConverter[1] = Math.sin(norm) * this._tauConverter[1] / norm, this._tauConverter[2] = Math.sin(norm) * this._tauConverter[2] / norm, this._tauConverter[3] = Math.cos(norm)) : (this._tauConverter[0] = 0, this._tauConverter[1] = 0, this._tauConverter[2] = 0, this._tauConverter[3] = 1), quat4.multiply(this.states[key].rot0, this._tauConverter, value), value
    }, Tw2RotationCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2RotationCurve.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2RotationCurve.BICumulative = function (order, t) {
        if (1 == order) {
            var some = 1 - t;
            return 1 - some * some * some
        }
        return 2 == order ? 3 * t * t - 2 * t * t * t : t * t * t
    }, Tw2RotationCurve.QuaternionPow = function (out, inq, exponent) {
        return 1 == exponent ? (quat4.set(inq, out), out) : (Tw2RotationCurve.QuaternionLn(out, inq), out[0] *= exponent, out[1] *= exponent, out[2] *= exponent, out[3] *= exponent, void Tw2RotationCurve.QuaternionExp(out, out))
    }, Tw2RotationCurve.QuaternionLn = function (out, q) {
        var norm = quat4.length(q);
        if (norm > 1.0001 || .99999 > norm) out[0] = q[0], out[1] = q[1], out[2] = q[2], out[3] = 0;
        else {
            var normvec = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
            if (0 == normvec) out[0] = 0, out[1] = 0, out[2] = 0, out[3] = 0;
            else {
                var theta = Math.atan2(normvec, q.w) / normvec;
                out[0] = theta * q[0], out[1] = theta * q[1], out[2] = theta * q[2], out[3] = 0
            }
        }
        return out
    }, Tw2RotationCurve.QuaternionExp = function (out, q) {
        var norm = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
        return norm ? (out[0] = Math.sin(norm) * q[0] / norm, out[1] = Math.sin(norm) * q[1] / norm, out[2] = Math.sin(norm) * q[2] / norm, out[3] = Math.cos(norm)) : (out[0] = 0, out[1] = 0, out[2] = 0, out[3] = 1), out
    }, Tw2RotationCurve.prototype.GetValueAt = function (t, value) {
        if (0 == this.length) return quat4.set(this.value, value), value;
        var firstKey = this.keys[0],
            lastKey = this.keys[this.keys.length - 1];
        if (t >= lastKey.time) {
            if (0 == this.extrapolation) return quat4.set(this.value, value), value;
            if (1 == this.extrapolation) return quat4.set(lastKey.value, value), value;
            t %= lastKey.time
        } else if (0 > t || t < firstKey.time) return 0 == this.extrapolation ? (quat4.set(this.value, value), value) : (quat4.set(firstKey.value, value), value);
        for (var ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1]; t >= ck.time || t < ck_1.time;) t < ck_1.time && (this._currKey = 0), this._currKey++, ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1];
        var nt = (t - ck_1.time) / (ck.time - ck_1.time);
        if (1 == ck_1.interpolation) quat4.set(ck_1.value, value);
        else {
            if (2 != ck_1.interpolation) {
                if (3 == ck_1.interpolation) {
                    var collect = quat4.create();
                    collect[3] = 1;
                    for (var arr = [ck_1.value, ck_1.right, ck.left, ck.value], i = 3; i > 0; i--) {
                        var power = Tw2RotationCurve.BICumulative(i, nt);
                        power > 1 && quat4.multiply(collect, arr[i], value), value[0] = -arr[i - 1][0], value[1] = -arr[i - 1][1], value[2] = -arr[i - 1][2], value[3] = arr[i - 1][3], quat4.multiply(value, arr[i], value), Tw2RotationCurve.QuaternionPow(value, value, power), quat4.multiply(collect, value, collect)
                    }
                    return quat4.multiply(collect, q0, value)
                }
                return 5 == ck_1.interpolation ? quat4.slerp(ck_1.value, ck.value, nt, value) : quat4.slerp(quat4.slerp(ck_1.value, ck.value, nt, quat4.create()), quat4.slerp(ck_1.right, ck.left, nt, quat4.create()), 2 * t * (1 - t), value)
            }
            value[0] = ck_1.value[0] * (1 - nt) + ck.value[0] * nt, value[1] = ck_1.value[1] * (1 - nt) + ck.value[1] * nt, value[2] = ck_1.value[2] * (1 - nt) + ck.value[2] * nt, value[3] = ck_1.value[3] * (1 - nt) + ck.value[3] * nt
        }
        return value
    }, Tw2ScalarCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2ScalarCurve.prototype.UpdateValue = function (t) {
        this.value = this.GetValueAt(t)
    }, Tw2ScalarCurve.prototype.GetValueAt = function (t) {
        if (t = t / this.timeScale - this.timeOffset, 0 == this.length) return this.value;
        var firstKey = this.keys[0],
            lastKey = this.keys[this.keys.length - 1];
        if (t >= lastKey.time) {
            if (0 == this.extrapolation) return this.value;
            if (1 == this.extrapolation) return lastKey.value;
            if (2 == this.extrapolation) {
                var d = t - lastKey.time;
                return lastKey.value + d * lastKey.right
            }
            t %= lastKey.time
        } else if (0 > t || t < firstKey.time) {
            if (0 == this.extrapolation) return this.value;
            if (2 == this.extrapolation) {
                var d = t * this.length - lastKey.time;
                return firstKey.value + d * firstKey.left
            }
            return firstKey.value
        }
        for (var ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1]; t >= ck.time || t < ck_1.time;) t < ck_1.time && (this._currKey = 0), this._currKey++, ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1];
        var nt = (t - ck_1.time) / (ck.time - ck_1.time);
        if (1 == ck_1.interpolation) return ck_1.value;
        if (2 == ck_1.interpolation) return ck_1.value * (1 - nt) + ck.value * nt;
        if (3 == ck_1.interpolation) {
            var k3 = 2 * nt * nt * nt - 3 * nt * nt + 1,
                k2 = -2 * nt * nt * nt + 3 * nt * nt,
                k1 = nt * nt * nt - 2 * nt * nt + nt,
                k0 = nt * nt * nt - nt * nt;
            return k3 * ck_1.value + k2 * ck.value + k1 * ck_1.right + k0 * ck.left
        }
        var sq = Math.sqrt(ck_1.value / ck.value),
            exponent = Math.exp(-t / ck_1.right),
            ret = 1 + (sq - 1) * exponent;
        return ret * ret * ck.value
    }, Tw2ScalarCurve2.prototype.GetLength = function () {
        return this.length
    }, Tw2ScalarCurve2.prototype.Initialize = function () {
        this.Sort()
    }, Tw2ScalarCurve2.Compare = function (a, b) {
        return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    }, Tw2ScalarCurve2.prototype.Sort = function () {
        if (this.keys.length) {
            this.keys.sort(Tw2ScalarCurve2.Compare);
            var back = this.keys[this.keys.length - 1];
            if (back.time > this.length) {
                var preLength = this.length,
                    endValue = this.endValue,
                    endTangent = this.endTangent;
                this.length = back.time, this.endValue = back.value, this.endTangent = back.leftTangent, preLength > 0 && (back.time = preLength, back.value = endValue, back.leftTangent = endTangent)
            }
        }
    }, Tw2ScalarCurve2.prototype.UpdateValue = function (t) {
        this.currentValue = this.GetValueAt(t)
    }, Tw2ScalarCurve2.prototype.GetValueAt = function (time) {
        if (time = time / this.timeScale + this.timeOffset, this.length <= 0 || 0 >= time) return this.startValue;
        if (time > this.length) {
            if (!this.cycle) return this.reversed ? this.startValue : this.endValue;
            time %= this.length
        }
        if (this.reversed && (time = this.length - time), 0 == this.keys.length) return this.Interpolate(time, null, null);
        var startKey = this.keys[0];
        if (time <= startKey.time) return this.Interpolate(time, null, startKey);
        if (time >= this.keys[this.keys.length - 1].time) return this.Interpolate(time, this.keys[this.keys.length - 1], null);
        for (var endKey = this.keys[i + 1], i = 0; i + 1 < this.keys.length && (startKey = this.keys[i], endKey = this.keys[i + 1], !(startKey.time <= time && endKey.time > time)); ++i);
        return this.Interpolate(time, startKey, endKey)
    }, Tw2ScalarCurve2.prototype.Interpolate = function (time, lastKey, nextKey) {
        var startValue = this.startValue,
            endValue = this.endValue,
            interp = this.interpolation,
            deltaTime = this.length;
        switch (null != lastKey && (interp = lastKey.interpolation, time -= lastKey.time), interp) {
            case 1:
                return lastKey && nextKey ? (startValue = lastKey.value, endValue = nextKey.value, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, deltaTime = this.length - lastKey.time), startValue + (endValue - startValue) * (time / deltaTime);
            case 2:
                var inTangent = this.startTangent,
                    outTangent = this.endTangent;
                lastKey && nextKey ? (startValue = lastKey.value, inTangent = lastKey.rightTangent, endValue = nextKey.value, outTangent = nextKey.leftTangent, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, outTangent = nextKey.leftTangent, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, inTangent = lastKey.rightTangent, deltaTime = length - lastKey.time);
                var s = time / deltaTime,
                    s2 = s * s,
                    s3 = s2 * s,
                    c2 = -2 * s3 + 3 * s2,
                    c1 = 1 - c2,
                    c4 = s3 - s2,
                    c3 = s + c4 - s2;
                return startValue * c1 + endValue * c2 + inTangent * c3 + outTangent * c4
        }
        return this.startValue
    }, Tw2ScalarSequencer.prototype.GetLength = function () {
        for (var length = 0, i = 0; i < this.functions.length; ++i) "GetLength" in this.functions[i] && (length = Math.max(length, this.functions[i].GetLength()));
        return length
    }, Tw2ScalarSequencer.prototype.UpdateValue = function (t) {
        this.value = this.GetValueAt(t)
    }, Tw2ScalarSequencer.prototype.GetValueAt = function (t) {
        if (0 == this.operator)
            for (var ret = 1, i = 0; i < this.functions.length; ++i) {
                var v = this.functions[i].GetValueAt(t);
                this.clamping && (v = Math.min(Math.max(v, this.inMinClamp), this.inMaxClamp)), ret *= v
            } else
            for (var ret = 0, i = 0; i < this.functions.length; ++i) {
                var v = this.functions[i].GetValueAt(t);
                this.clamping && (v = Math.min(Math.max(v, this.inMinClamp), this.inMaxClamp)), ret += v
            }
        return this.clamping && (ret = Math.min(Math.max(ret, this.outMinClamp), this.outMaxClamp)), ret
    }, Tw2SineCurve.prototype.UpdateValue = function (t) {
        this.value = this.GetValueAt(t)
    }, Tw2SineCurve.prototype.GetValueAt = function (t) {
        return Math.sin(t * Math.pi * 2 * this.speed) * this.scale + this.offset
    }, Tw2TransformTrack.prototype.Initialize = function () {
        "" != this.resPath && (this.res = resMan.GetResource(this.resPath))
    }, Tw2TransformTrack.prototype.GetLength = function () {
        return this.duration
    }, Tw2TransformTrack.prototype.EvaluateCurve = function (curve, time, value, cycle, duration) {
        for (var count = curve.knots.length, knot = count - 1, t = 0, i = 0; i < curve.knots.length; ++i)
            if (curve.knots[i] > time) {
                knot = i;
                break
            }
        if (0 == curve.degree)
            for (var i = 0; i < curve.dimension; ++i) value[i] = curve.controls[knot * curve.dimension + i];
        else if (1 == curve.degree) {
            var knot0 = cycle ? (knot + count - 1) % count : 0 == knot ? 0 : knot - 1,
                dt = curve.knots[knot] - curve.knots[knot0];
            0 > dt && (dt += duration), dt > 0 && (t = (time - curve.knots[i - 1]) / dt);
            for (var i = 0; i < curve.dimension; ++i) value[i] = curve.controls[knot0 * curve.dimension + i] * (1 - t) + curve.controls[knot * curve.dimension + i] * t
        } else {
            var k_2 = cycle ? (knot + count - 2) % count : 0 == knot ? 0 : knot - 2,
                k_1 = cycle ? (knot + count - 1) % count : 0 == knot ? 0 : knot - 1,
                p1 = k_2 * curve.dimension,
                p2 = k_1 * curve.dimension,
                p3 = knot * curve.dimension,
                ti_2 = curve.knots[k_2],
                ti_1 = curve.knots[k_1],
                ti = curve.knots[knot],
                ti1 = curve.knots[(knot + 1) % count];
            ti_2 > ti && (ti += duration, ti1 += duration, time += duration), ti_1 > ti && (ti += duration, ti1 += duration, time += duration), ti > ti1 && (ti1 += duration);
            var tmti_1 = time - ti_1,
                tmti_2 = time - ti_2,
                dL0 = ti - ti_1,
                dL1_1 = ti - ti_2,
                dL1_2 = ti1 - ti_1,
                L0 = tmti_1 / dL0,
                L1_1 = tmti_2 / dL1_1,
                L1_2 = tmti_1 / dL1_2,
                ci_2 = L1_1 + L0 - L0 * L1_1,
                ci = L0 * L1_2,
                ci_1 = ci_2 - ci;
            ci_2 = 1 - ci_2;
            for (var i = 0; i < curve.dimension; ++i) value[i] = ci_2 * curve.controls[p1 + i] + ci_1 * curve.controls[p2 + i] + ci * curve.controls[p3 + i]
        }
    }, Tw2TransformTrack.prototype.UpdateValue = function (t) {
        this.res && this.res.IsGood() && (this.positionCurve || this.FindTracks(), this.positionCurve && (this.cycle && (t %= this.duration), t > this.duration || 0 > t || (this.EvaluateCurve(this.positionCurve, t, this.translation, this.cycle, this.duration), this.EvaluateCurve(this.orientationCurve, t, this.rotation, this.cycle, this.duration), quat4.normalize(orientation), this.EvaluateCurve(this.scaleCurve, t, this._scaleShear, this.cycle, this.duration), this.scale[0] = vec3.length(this.scaleCurve), this.scale[1] = vec3.length(this.scaleCurve.subarray(3, 6)), this.scale[2] = vec3.length(this.scaleCurve.subarray(6, 9)))))
    }, Tw2TransformTrack.prototype.FindTracks = function () {
        for (var group = null, i = 0; i < this.res.animations.length; ++i)
            for (var j = 0; j < this.res.animations[i].trackGroups.length; ++j)
                if (this.res.animations[i].trackGroups[j].name == this.group) {
                    this.duration = this.res.animations[i].duration, group = this.res.animations[i].trackGroups[j];
                    break
                }
        if (group)
            for (var i = 0; i < group.transformTracks.length; ++i)
                if (this.name == group.transformTracks[i].name) {
                    this.positionCurve = group.transformTracks[i].position, this.orientationCurve = group.transformTracks[i].orientation, this.scaleCurve = group.transformTracks[i].scaleShear;
                    break
                }
    }, Tw2Vector2Curve.prototype.Initialize = function () {
        this.Sort()
    }, Tw2Vector2Curve.prototype.GetLength = function () {
        return this.length
    }, Tw2Vector2Curve.Compare = function (a, b) {
        return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    }, Tw2Vector2Curve.prototype.Sort = function () {
        if (this.keys.length) {
            this.keys.sort(Tw2Vector2Curve.Compare);
            var back = this.keys[this.keys.length - 1];
            if (back.time > this.length) {
                var preLength = this.length,
                    endValue = this.endValue,
                    endTangent = this.endTangent;
                this.length = back.time, this.endValue = back.value, this.endTangent = back.leftTangent, preLength > 0 && (back.time = preLength, back.value = endValue, back.leftTangent = endTangent)
            }
        }
    }, Tw2Vector2Curve.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.currentValue)
    }, Tw2Vector2Curve.prototype.GetValueAt = function (time, value) {
        if (time = time / this.timeScale + this.timeOffset, this.length <= 0 || 0 >= time) return value[0] = this.startValue[0], value[1] = this.startValue[1], value;
        if (time > this.length) {
            if (!this.cycle) return this.reversed ? (value[0] = this.startValue[0], value[1] = this.startValue[1], value) : (value[0] = this.endValue[0], value[1] = this.endValue[1], value);
            time %= this.length
        }
        if (this.reversed && (time = this.length - time), 0 == this.keys.length) return this.Interpolate(time, null, null, value);
        var startKey = this.keys[0];
        if (time <= startKey.time) return this.Interpolate(time, null, startKey, value);
        if (time >= this.keys[this.keys.length - 1].time) return this.Interpolate(time, this.keys[this.keys.length - 1], null, value);
        for (var endKey = this.keys[i + 1], i = 0; i + 1 < this.keys.length && (startKey = this.keys[i], endKey = this.keys[i + 1], !(startKey.time <= time && endKey.time > time)); ++i);
        return this.Interpolate(time, startKey, endKey, value)
    }, Tw2Vector2Curve.prototype.Interpolate = function (time, lastKey, nextKey, value) {
        value[0] = this.startValue[0], value[1] = this.startValue[1];
        var startValue = this.startValue,
            endValue = this.endValue,
            interp = this.interpolation,
            deltaTime = this.length;
        switch (null != lastKey && (interp = lastKey.interpolation, time -= lastKey.time), interp) {
            case 1:
                return lastKey && nextKey ? (startValue = lastKey.value, endValue = nextKey.value, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, deltaTime = this.length - lastKey.time), value[0] = startValue[0] + (endValue[0] - startValue[0]) * (time / deltaTime), value[1] = startValue[1] + (endValue[1] - startValue[1]) * (time / deltaTime), value;
            case 2:
                var inTangent = this.startTangent,
                    outTangent = this.endTangent;
                lastKey && nextKey ? (startValue = lastKey.value, inTangent = lastKey.rightTangent, endValue = nextKey.value, outTangent = nextKey.leftTangent, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, outTangent = nextKey.leftTangent, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, inTangent = lastKey.rightTangent, deltaTime = this.length - lastKey.time);
                var s = time / deltaTime,
                    s2 = s * s,
                    s3 = s2 * s,
                    c2 = -2 * s3 + 3 * s2,
                    c1 = 1 - c2,
                    c4 = s3 - s2,
                    c3 = s + c4 - s2;
                return value[0] = startValue[0] * c1 + endValue[0] * c2 + inTangent[0] * c3 + outTangent[0] * c4, value[1] = startValue[1] * c1 + endValue[1] * c2 + inTangent[1] * c3 + outTangent[1] * c4, value
        }
        return value
    }, Tw2Vector3Curve.prototype.Initialize = function () {
        this.Sort()
    }, Tw2Vector3Curve.prototype.GetLength = function () {
        return this.length
    }, Tw2Vector3Curve.Compare = function (a, b) {
        return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    }, Tw2Vector3Curve.prototype.Sort = function () {
        if (this.keys.length) {
            this.keys.sort(Tw2Vector3Curve.Compare);
            var back = this.keys[this.keys.length - 1];
            if (back.time > this.length) {
                var preLength = this.length,
                    endValue = this.endValue,
                    endTangent = this.endTangent;
                this.length = back.time, this.endValue = back.value, this.endTangent = back.leftTangent, preLength > 0 && (back.time = preLength, back.value = endValue, back.leftTangent = endTangent)
            }
        }
    }, Tw2Vector3Curve.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.currentValue)
    }, Tw2Vector3Curve.prototype.GetValueAt = function (time, value) {
        if (time = time / this.timeScale + this.timeOffset, this.length <= 0 || 0 >= time) return value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value;
        if (time > this.length) {
            if (!this.cycle) return this.reversed ? (value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value) : (value[0] = this.endValue[0], value[1] = this.endValue[1], value[2] = this.endValue[2], value);
            time %= this.length
        }
        if (this.reversed && (time = this.length - time), 0 == this.keys.length) return this.Interpolate(time, null, null, value);
        var startKey = this.keys[0];
        if (time <= startKey.time) return this.Interpolate(time, null, startKey, value);
        if (time >= this.keys[this.keys.length - 1].time) return this.Interpolate(time, this.keys[this.keys.length - 1], null, value);
        for (var endKey = this.keys[i + 1], i = 0; i + 1 < this.keys.length && (startKey = this.keys[i], endKey = this.keys[i + 1], !(startKey.time <= time && endKey.time > time)); ++i);
        return this.Interpolate(time, startKey, endKey, value)
    }, Tw2Vector3Curve.prototype.Interpolate = function (time, lastKey, nextKey, value) {
        value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2];
        var startValue = this.startValue,
            endValue = this.endValue,
            interp = this.interpolation,
            deltaTime = this.length;
        switch (null != lastKey && (interp = lastKey.interpolation, time -= lastKey.time), interp) {
            case 1:
                return lastKey && nextKey ? (startValue = lastKey.value, endValue = nextKey.value, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, deltaTime = this.length - lastKey.time), value[0] = startValue[0] + (endValue[0] - startValue[0]) * (time / deltaTime), value[1] = startValue[1] + (endValue[1] - startValue[1]) * (time / deltaTime), value[2] = startValue[2] + (endValue[2] - startValue[2]) * (time / deltaTime), value;
            case 2:
                var inTangent = this.startTangent,
                    outTangent = this.endTangent;
                lastKey && nextKey ? (startValue = lastKey.value, inTangent = lastKey.rightTangent, endValue = nextKey.value, outTangent = nextKey.leftTangent, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, outTangent = nextKey.leftTangent, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, inTangent = lastKey.rightTangent, deltaTime = this.length - lastKey.time);
                var s = time / deltaTime,
                    s2 = s * s,
                    s3 = s2 * s,
                    c2 = -2 * s3 + 3 * s2,
                    c1 = 1 - c2,
                    c4 = s3 - s2,
                    c3 = s + c4 - s2;
                return value[0] = startValue[0] * c1 + endValue[0] * c2 + inTangent[0] * c3 + outTangent[0] * c4, value[1] = startValue[1] * c1 + endValue[1] * c2 + inTangent[1] * c3 + outTangent[1] * c4, value[2] = startValue[2] * c1 + endValue[2] * c2 + inTangent[2] * c3 + outTangent[2] * c4, value
        }
        return value
    }, Tw2VectorCurve.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2VectorCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2VectorCurve.prototype.GetValueAt = function (t, value) {
        if (0 == this.length) return value[0] = this.value[0], value[1] = this.value[1], value[2] = this.value[2], value;
        var firstKey = this.keys[0],
            lastKey = this.keys[this.keys.length - 1];
        if (t >= lastKey.time) {
            if (0 == this.extrapolation) return value[0] = this.value[0], value[1] = this.value[1], value[2] = this.value[2], value;
            if (1 == this.extrapolation) return value[0] = lastKey.value[0], value[1] = lastKey.value[1], value[2] = lastKey.value[2], value;
            if (2 == this.extrapolation) {
                var d = t - lastKey.time;
                return value[0] = lastKey.value[0] + d * lastKey.right[0], value[1] = lastKey.value[1] + d * lastKey.right[1], value[2] = lastKey.value[2] + d * lastKey.right[2], value
            }
            t %= lastKey.time
        } else if (0 > t || t < firstKey.time) {
            if (0 == this.extrapolation) return value[0] = this.value[0], value[1] = this.value[1], value[2] = this.value[2], value;
            if (2 == this.extrapolation) {
                var d = t * this.length - lastKey.time;
                return value[0] = firstKey.value[0] + d * firstKey.left[0], value[1] = firstKey.value[1] + d * firstKey.left[1], value[2] = firstKey.value[2] + d * firstKey.left[2], value
            }
            return value[0] = firstKey.value[0], value[1] = firstKey.value[1], value[2] = firstKey.value[2], value
        }
        for (var ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1]; t >= ck.time || t < ck_1.time;) t < ck_1.time && (this._currKey = 0), this._currKey++, ck = this.keys[this._currKey], ck_1 = this.keys[this._currKey - 1];
        var nt = (t - ck_1.time) / (ck.time - ck_1.time);
        if (1 == ck_1.interpolation) value[0] = ck_1.value[0], value[1] = ck_1.value[1], value[2] = ck_1.value[2];
        else if (2 == ck_1.interpolation) value[0] = ck_1.value[0] * (1 - nt) + ck.value[0] * nt, value[1] = ck_1.value[1] * (1 - nt) + ck.value[1] * nt, value[2] = ck_1.value[2] * (1 - nt) + ck.value[2] * nt;
        else if (3 == ck_1.interpolation) {
            var k3 = 2 * nt * nt * nt - 3 * nt * nt + 1,
                k2 = -2 * nt * nt * nt + 3 * nt * nt,
                k1 = nt * nt * nt - 2 * nt * nt + nt,
                k0 = nt * nt * nt - nt * nt;
            value[0] = k3 * ck_1.value[0] + k2 * ck.value[0] + k1 * ck_1.right[0] + k0 * ck.left[0], value[1] = k3 * ck_1.value[1] + k2 * ck.value[1] + k1 * ck_1.right[1] + k0 * ck.left[1], value[2] = k3 * ck_1.value[2] + k2 * ck.value[2] + k1 * ck_1.right[2] + k0 * ck.left[2]
        }
        return value
    }, Tw2VectorSequencer.prototype.GetLength = function () {
        for (var length = 0, i = 0; i < this.functions.length; ++i) "GetLength" in this.functions[i] && (length = Math.max(length, this.functions[i].GetLength()));
        return length
    }, Tw2VectorSequencer.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2VectorSequencer.prototype.GetValueAt = function (t, value) {
        if (0 == this.operator) {
            value[0] = 1, value[1] = 1, value[2] = 1;
            for (var tempValue = this._tempValue, functions = this.functions, i = 0; i < functions.length; ++i) functions[i].GetValueAt(t, tempValue), value[0] *= tempValue[0], value[1] *= tempValue[1], value[2] *= tempValue[2]
        } else {
            value[0] = 0, value[1] = 0, value[2] = 0;
            for (var tempValue = this._tempValue, functions = this.functions, i = 0; i < functions.length; ++i) functions[i].GetValueAt(t, tempValue), value[0] += tempValue[0], value[1] += tempValue[1], value[2] += tempValue[2]
        }
        return value
    }, Tw2XYZScalarSequencer.prototype.GetLength = function () {
        var length = 0;
        return this.XCurve && "GetLength" in this.XCurve && (length = this.XCurve.GetLength()), this.YCurve && "GetLength" in this.YCurve && (length = Math.max(length, this.YCurve.GetLength())), this.ZCurve && "GetLength" in this.ZCurve && (length = Math.max(length, this.ZCurve.GetLength())), length
    }, Tw2XYZScalarSequencer.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2XYZScalarSequencer.prototype.GetValueAt = function (t, value) {
        return value[0] = this.XCurve ? this.XCurve.GetValueAt(t) : 0, value[1] = this.YCurve ? this.YCurve.GetValueAt(t) : 0, value[2] = this.ZCurve ? this.ZCurve.GetValueAt(t) : 0, value
    }, Tw2YPRSequencer.prototype.GetLength = function () {
        var length = 0;
        return this.YawCurve && "GetLength" in this.YawCurve && (length = this.YawCurve.GetLength()), this.PitchCurve && "GetLength" in this.PitchCurve && (length = Math.max(length, this.PitchCurve.GetLength())), this.RollCurve && "GetLength" in this.RollCurve && (length = Math.max(length, this.RollCurve.GetLength())), length
    }, Tw2YPRSequencer.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.value)
    }, Tw2YPRSequencer.prototype.GetValueAt = function (t, value) {
        this.YawCurve && (this.YawPitchRoll[0] = this.YawCurve.GetValueAt(t)), this.PitchCurve && (this.YawPitchRoll[1] = this.PitchCurve.GetValueAt(t)), this.RollCurve && (this.YawPitchRoll[2] = this.RollCurve.GetValueAt(t));
        var sinYaw = Math.sin(this.YawPitchRoll[0] / 180 * Math.PI / 2),
            cosYaw = Math.cos(this.YawPitchRoll[0] / 180 * Math.PI / 2),
            sinPitch = Math.sin(this.YawPitchRoll[1] / 180 * Math.PI / 2),
            cosPitch = Math.cos(this.YawPitchRoll[1] / 180 * Math.PI / 2),
            sinRoll = Math.sin(this.YawPitchRoll[2] / 180 * Math.PI / 2),
            cosRoll = Math.cos(this.YawPitchRoll[2] / 180 * Math.PI / 2);
        return value[0] = sinYaw * cosPitch * sinRoll + cosYaw * sinPitch * cosRoll, value[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll, value[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll, value[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll, value
    }, Tw2MayaAnimationEngine.AnimCurveFields = {
        NUM_SEGMENTS: 0,
        SEGMENT_OFFSET: 1,
        END_TIME: 2,
        END_VALUE: 3,
        IN_TANGENT: 4,
        OUT_TANGENT: 5,
        PRE_INFINITY: 6,
        POST_INFINITY: 7,
        IS_WEIGHTED: 8
    }, Tw2MayaAnimationEngine.AnimSegment = {
        TIME: 0,
        VALUE: 1
    }, Tw2MayaAnimationEngine.HermiteSegment = {
        TIME: 0,
        VALUE: 1,
        COEFF: 2,
        IS_STEP: 3,
        IS_STEP_NEXT: 4
    }, Tw2MayaAnimationEngine.BezierSegment = {
        TIME: 0,
        VALUE: 1,
        COEFF: 2,
        POLYY: 3,
        IS_STEP: 4,
        IS_STEP_NEXT: 5,
        IS_LINEAR: 6
    }, Tw2MayaAnimationEngine.INFINITY = 0, Tw2MayaAnimationEngine.prototype.Evaluate = function (curveIndex, time) {
        if (this.curves.length <= curveIndex) return 0;
        if (this._currentCurveIndex = curveIndex, !this._evalCache) {
            this._evalCache = new Array(this.curves.length);
            for (var i = 0; i < this._evalCache.length; ++i) this._evalCache[i] = -1
        }
        var animCurve = this.curves[curveIndex],
            firstSegment = animCurve[Tw2MayaAnimationEngine.AnimCurveFields.SEGMENT_OFFSET],
            segments = null;
        return segments = animCurve[Tw2MayaAnimationEngine.AnimCurveFields.IS_WEIGHTED] ? this.bezierSegments : this.hermiteSegments, time < segments[firstSegment][Tw2MayaAnimationEngine.AnimSegment.TIME] ? animCurve[Tw2MayaAnimationEngine.AnimCurveFields.PRE_INFINITY] == Tw2MayaAnimationEngine.INFINITY ? segments[firstSegment][Tw2MayaAnimationEngine.AnimSegment.VALUE] : this._EvaluateInfinities(animCurve, segments, firstSegment, time, !0) : time > animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_TIME] ? animCurve[Tw2MayaAnimationEngine.AnimCurveFields.POST_INFINITY] == Tw2MayaAnimationEngine.INFINITY ? animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_VALUE] : this._EvaluateInfinities(animCurve, segments, firstSegment, time, !1) : this._EvaluateImpl(animCurve, segments, firstSegment, time)
    }, Tw2MayaAnimationEngine.prototype._EvaluateImpl = function (animCurve, segments, firstSegment, time) {
        var index, withinInterval = !1,
            nextSegment = null,
            lastSegment = null;
        if (this._evalCache[this._currentCurveIndex] >= 0)
            if (lastSegment = firstSegment + this._evalCache[this._currentCurveIndex], this._evalCache[this._currentCurveIndex] < animCurve[Tw2MayaAnimationEngine.AnimCurveFields.NUM_SEGMENTS - 1] && time > segments[lastSegment][Tw2MayaAnimationEngine.AnimSegment.TIME]) {
                if (nextSegment = firstSegment + this._evalCache[this._currentCurveIndex] + 1, time == segments[nextSegment][Tw2MayaAnimationEngine.AnimSegment.TIME]) return this._evalCache[this._currentCurveIndex]++, segments[nextSegment][Tw2MayaAnimationEngine.AnimSegment.VALUE];
                time < segments[nextSegment][Tw2MayaAnimationEngine.AnimSegment.TIME] ? (index = this._evalCache[this._currentCurveIndex] + 1, withinInterval = !0) : nextSegment = null
            } else if (this._evalCache[this._currentCurveIndex] > 0 && time < segments[lastSegment][Tw2MayaAnimationEngine.AnimSegment.TIME]) {
                var prevSegment = firstSegment + this._evalCache[this._currentCurveIndex] - 1;
                if (time > segments[prevSegment][Tw2MayaAnimationEngine.AnimSegment.TIME]) index = this._evalCache[this._currentCurveIndex], withinInterval = !0;
                else if (time == segments[prevSegment][Tw2MayaAnimationEngine.AnimSegment.TIME]) return this._evalCache[this._currentCurveIndex]--, segments[prevSegment][Tw2MayaAnimationEngine.AnimSegment.VALUE]
            }
        if (!withinInterval) {
            var result = this._Find(animCurve, time, segments, firstSegment);
            if (index = result[1], result[0] || 0 == index) return index == animCurve[Tw2MayaAnimationEngine.AnimCurveFields.NUM_SEGMENTS] ? (index--, this._evalCache[this._currentCurveIndex] = index, animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_VALUE]) : (this._evalCache[this._currentCurveIndex] = index, segments[firstSegment + index][Tw2MayaAnimationEngine.AnimSegment.VALUE]);
            if (index == animCurve[Tw2MayaAnimationEngine.AnimCurveFields.NUM_SEGMENTS] + 1) return this._evalCache[this._currentCurveIndex] = 0, animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_VALUE]
        }
        if (this._evalCache[this._currentCurveIndex] != index - 1 && (this._evalCache[this._currentCurveIndex] = index - 1, lastSegment = firstSegment + this._evalCache[this._currentCurveIndex], null == nextSegment && (nextSegment = firstSegment + index)), animCurve[Tw2MayaAnimationEngine.AnimCurveFields.IS_WEIGHTED]) {
            var bSegment = segments[lastSegment];
            if (bSegment[Tw2MayaAnimationEngine.BezierSegment.IS_STEP]) return bSegment[Tw2MayaAnimationEngine.BezierSegment.VALUE];
            if (bSegment[Tw2MayaAnimationEngine.BezierSegment.IS_STEP_NEXT]) return null === nextSegment ? animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_VALUE] : segments[nextSegment][Tw2MayaAnimationEngine.BezierSegment.VALUE];
            var nextKeyTime = animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_TIME];
            return this._evalCache[this._currentCurveIndex] + 1 < animCurve[Tw2MayaAnimationEngine.AnimCurveFields.NUM_SEGMENTS] && (nextKeyTime = segments[nextSegment][Tw2MayaAnimationEngine.BezierSegment.TIME]), this._EvaluateBezier(bSegment, time, nextKeyTime)
        }
        var hSegment = segments[lastSegment];
        return hSegment[Tw2MayaAnimationEngine.HermiteSegment.IS_STEP] ? hSegment[Tw2MayaAnimationEngine.HermiteSegment.VALUE] : hSegment[Tw2MayaAnimationEngine.HermiteSegment.IS_STEP_NEXT] ? null === nextSegment ? animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_VALUE] : segments[nextSegment][Tw2MayaAnimationEngine.HermiteSegment.VALUE] : this._EvaluateHermite(hSegment, time)
    }, Tw2MayaAnimationEngine.prototype._EvaluateHermite = function (segment, time) {
        var t = time - segment[Tw2MayaAnimationEngine.HermiteSegment.TIME],
            coeff = segment[Tw2MayaAnimationEngine.HermiteSegment.COEFF];
        return t * (t * (t * coeff[0] + coeff[1]) + coeff[2]) + coeff[3]
    }, Tw2MayaAnimationEngine.prototype._EvaluateBezier = function (segment, time) {
        var t, s;
        if (s = (time - segment[Tw2MayaAnimationEngine.BezierSegment.TIME]) / (nextSegmentTime - segment[Tw2MayaAnimationEngine.BezierSegment.TIME]), segment[Tw2MayaAnimationEngine.BezierSegment.IS_LINEAR]) t = s;
        else {
            var roots = (segment[Tw2MayaAnimationEngine.BezierSegment.COEFF][3], segment[Tw2MayaAnimationEngine.BezierSegment.COEFF][2], segment[Tw2MayaAnimationEngine.BezierSegment.COEFF][1], segment[Tw2MayaAnimationEngine.BezierSegment.COEFF][0] - s, []);
            t = 1 == polyZeroes(poly, 3, 0, 1, 1, 1, roots) ? roots[0] : 0
        }
        var poly = segment[Tw2MayaAnimationEngine.BezierSegment.POLYY];
        return t * (t * (t * poly[3] + poly[2]) + poly[1]) + poly[0]
    }, Tw2MayaAnimationEngine.prototype._Find = function (animCurve, time, segments, firstSegment) {
        var len, mid, low, high, index = 0;
        len = animCurve[Tw2MayaAnimationEngine.AnimCurveFields.NUM_SEGMENTS] + 1;
        var segment = null,
            stime = 0;
        if (len > 0) {
            low = 0, high = len - 1;
            do
                if (mid = low + high >> 1, len - 1 > mid ? (segment = firstSegment + mid, stime = segments[segment][Tw2MayaAnimationEngine.AnimSegment.TIME]) : stime = animCurve[Tw2MayaAnimationEngine.AnimCurveFields.END_TIME], stime > time) high = mid - 1;
                else {
                    if (!(time > stime)) return index = mid, [!0, index];
                    low = mid + 1
                }
            while (high >= low);
            index = low
        }
        return [!1, index]
    }, Tw2MayaAnimationEngine.prototype.GetNumberOfCurves = function () {
        return this.curves.length
    }, Tw2MayaAnimationEngine.prototype.GetLength = function (index) {
        if (0 > index || index >= this.curves.length) return 0;
        var curve = this.curves[index];
        if (curve[Tw2MayaAnimationEngine.AnimCurveFields.IS_WEIGHTED]) var firstSegment = this.bezierSegments[curve[Tw2MayaAnimationEngine.AnimCurveFields.SEGMENT_OFFSET]];
        else var firstSegment = this.hermiteSegments[curve[Tw2MayaAnimationEngine.AnimCurveFields.SEGMENT_OFFSET]];
        return curve[Tw2MayaAnimationEngine.AnimCurveFields.END_TIME] - firstSegment[Tw2MayaAnimationEngine.AnimSegment.TIME]
    }, Tw2MayaScalarCurve.prototype.Initialize = function () {
        return this.ComputeLength(), !0
    }, Tw2MayaScalarCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2MayaScalarCurve.prototype.UpdateValue = function (t) {
        this.animationEngine && (this.value = this.animationEngine.Evaluate(this.index, t))
    }, Tw2MayaScalarCurve.prototype.ComputeLength = function () {
        this.animationEngine && 0 != this.animationEngine.GetNumberOfCurves() && this.index >= 0 && (this.length = this.animationEngine.GetLength(this.index))
    }, Tw2MayaVector3Curve.prototype.Initialize = function () {
        return this.ComputeLength(), !0
    }, Tw2MayaVector3Curve.prototype.GetLength = function () {
        return this.length
    }, Tw2MayaVector3Curve.prototype.UpdateValue = function (t) {
        this.animationEngine && (this.xIndex && (this.value[0] = this.animationEngine.Evaluate(this.xIndex, t)), this.yIndex && (this.value[1] = this.yIndex == this.xIndex ? this.value[0] : this.animationEngine.Evaluate(this.yIndex, t)), this.zIndex && (this.value[2] = this.zIndex == this.xIndex ? this.value[0] : this.animationEngine.Evaluate(this.zIndex, t)))
    }, Tw2MayaVector3Curve.prototype.ComputeLength = function () {
        this.animationEngine && 0 != this.animationEngine.GetNumberOfCurves() && (this.length = 0, this.xIndex >= 0 && (this.length = this.animationEngine.GetLength(this.xIndex)), this.yIndex >= 0 && (this.length = Math.max(this.length, this.animationEngine.GetLength(this.yIndex))), this.zIndex >= 0 && (this.length = Math.max(this.length, this.animationEngine.GetLength(this.zIndex))))
    }, Tw2MayaEulerRotationCurve.prototype.Initialize = function () {
        return this.ComputeLength(), !0
    }, Tw2MayaEulerRotationCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2MayaEulerRotationCurve.prototype.UpdateValue = function (t) {
        if (this.animationEngine && (this.xIndex && (this.eulerValue[0] = this.animationEngine.Evaluate(this.xIndex, t)), this.yIndex && (this.eulerValue[1] = this.yIndex == this.xIndex ? this.eulerValue[0] : this.animationEngine.Evaluate(this.yIndex, t)), this.zIndex && (this.eulerValue[2] = this.zIndex == this.xIndex ? this.eulerValue[0] : this.animationEngine.Evaluate(this.zIndex, t)), this.updateQuaternion)) {
            var sinYaw = Math.sin(this.eulerValue[0] / 2),
                cosYaw = Math.cos(this.eulerValue[0] / 2),
                sinPitch = Math.sin(this.eulerValue[1] / 2),
                cosPitch = Math.cos(this.eulerValue[1] / 2),
                sinRoll = Math.sin(this.eulerValue[2] / 2),
                cosRoll = Math.cos(this.eulerValue[2] / 2);
            this.quatValue[0] = sinYaw * cosPitch * sinRoll + cosYaw * sinPitch * cosRoll, this.quatValue[1] = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll, this.quatValue[2] = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll, this.quatValue[3] = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll
        }
    }, Tw2MayaEulerRotationCurve.prototype.ComputeLength = function () {
        this.animationEngine && 0 != this.animationEngine.GetNumberOfCurves() && (this.length = 0, this.xIndex >= 0 && (this.length = this.animationEngine.GetLength(this.xIndex)), this.yIndex >= 0 && (this.length = Math.max(this.length, this.animationEngine.GetLength(this.yIndex))), this.zIndex >= 0 && (this.length = Math.max(this.length, this.animationEngine.GetLength(this.zIndex))))
    }, Tw2QuaternionCurve.prototype.Initialize = function () {
        this.Sort()
    }, Tw2QuaternionCurve.prototype.GetLength = function () {
        return this.length
    }, Tw2QuaternionCurve.Compare = function (a, b) {
        return a.time < b.time ? -1 : a.time > b.time ? 1 : 0
    }, Tw2QuaternionCurve.prototype.Sort = function () {
        if (this.keys.length) {
            this.keys.sort(Tw2QuaternionCurve.Compare);
            var back = this.keys[this.keys.length - 1];
            if (back.time > this.length) {
                var preLength = this.length,
                    endValue = this.endValue,
                    endTangent = this.endTangent;
                this.length = back.time, this.endValue = back.value, this.endTangent = back.leftTangent, preLength > 0 && (back.time = preLength, back.value = endValue, back.leftTangent = endTangent)
            }
        }
    }, Tw2QuaternionCurve.prototype.UpdateValue = function (t) {
        this.GetValueAt(t, this.currentValue)
    }, Tw2QuaternionCurve.prototype.GetValueAt = function (time, value) {
        if (time = time / this.timeScale + this.timeOffset, this.length <= 0 || 0 >= time) return value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value;
        if (time > this.length) {
            if (!this.cycle) return this.reversed ? (value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2], value) : (value[0] = this.endValue[0], value[1] = this.endValue[1], value[2] = this.endValue[2], value);
            time %= this.length
        }
        if (this.reversed && (time = this.length - time), 0 == this.keys.length) return this.Interpolate(time, null, null, value);
        var startKey = this.keys[0];
        if (time <= startKey.time) return this.Interpolate(time, null, startKey, value);
        if (time >= this.keys[this.keys.length - 1].time) return this.Interpolate(time, this.keys[this.keys.length - 1], null, value);
        for (var endKey = this.keys[0], i = 0; i + 1 < this.keys.length && (startKey = this.keys[i], endKey = this.keys[i + 1], !(startKey.time <= time && endKey.time > time)); ++i);
        return this.Interpolate(time, startKey, endKey, value)
    }, Tw2QuaternionCurve.prototype.Interpolate = function (time, lastKey, nextKey, value) {
        value[0] = this.startValue[0], value[1] = this.startValue[1], value[2] = this.startValue[2];
        var startValue = this.startValue,
            endValue = this.endValue,
            interp = this.interpolation,
            deltaTime = this.length;
        switch (null != lastKey && (interp = lastKey.interpolation, time -= lastKey.time), interp) {
            case 4:
                return lastKey && nextKey ? (startValue = lastKey.value, endValue = nextKey.value, deltaTime = nextKey.time - lastKey.time) : nextKey ? (endValue = nextKey.value, deltaTime = nextKey.time) : lastKey && (startValue = lastKey.value, deltaTime = this.length - lastKey.time), quat4.slerp(startValue, endValue, time / deltaTime, value), value
        }
        return value
    }, Tw2WbgTransformTrack.prototype = new Tw2WbgTrack, EveBoosterSet.prototype.Initialize = function () {
        this.rebuildPending = !0
    }, EveBoosterSet.prototype.Clear = function () {
        this._boosterTransforms = [], this._wavePhase = mat4.create(), this.glows && this.glows.Clear()
    }, EveBoosterSet.prototype.Add = function (localMatrix) {
        var transform = mat4.create();
        if (mat4.set(localMatrix, transform), this._boosterTransforms[this._boosterTransforms.length] = transform, this._wavePhase[this._wavePhase.length] = Math.random(), this.glows) {
            var pos = vec3.create([localMatrix[12], localMatrix[13], localMatrix[14]]),
                dir = vec3.create([localMatrix[8], localMatrix[9], localMatrix[10]]),
                scale = vec3.length(dir),
                spritePos = vec3.create();
            vec3.subtract(pos, vec3.scale(dir, 2.5, spritePos), spritePos), this.glows.Add(spritePos, 0, 0, scale * this.glowScale, scale * this.glowScale, 0, this.glowColor), vec3.subtract(pos, vec3.scale(dir, 3, spritePos), spritePos), this.glows.Add(spritePos, 0, 1, scale * this.symHaloScale, scale * this.symHaloScale, 0, this.haloColor), vec3.subtract(pos, vec3.scale(dir, 3.01, spritePos), spritePos), this.glows.Add(spritePos, 0, 1, scale * this.haloScaleX, scale * this.haloScaleY, 0, this.haloColor)
        }
    }, EveBoosterSet.prototype.Rebuild = function () {
        for (var data = new Float32Array(4 * this._boosterTransforms.length * 6 * 26), order = [
            [-1, -1, 0, 1, 1],
            [1, 1, -1, 0, 0],
            [-1, -1, -1, 1, 0],
            [-1, -1, 0, 1, 1],
            [1, 1, 0, 0, 1],
            [1, 1, -1, 0, 0]
        ], index = 0, booster = 0; booster < this._boosterTransforms.length; ++booster)
            for (var i = (vec3.create(), 0); 4 > i; ++i)
                for (var t = i * Math.PI / 4, x = .5 * Math.cos(t), y = .5 * Math.sin(t), j = 0; 6 > j; ++j) data[index++] = x * order[j][0], data[index++] = y * order[j][1], data[index++] = order[j][2], data[index++] = order[j][3], data[index++] = order[j][4], data.set(this._boosterTransforms[booster], index), index += 16, data[index++] = 0, data[index++] = 1, data[index++] = 1, data[index++] = 1, data[index++] = this._wavePhase[booster];
        device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._positions), device.gl.bufferData(device.gl.ARRAY_BUFFER, data, device.gl.STATIC_DRAW), this.rebuildPending = !1, this.glows && this.glows.RebuildBuffers()
    }, EveBoosterSet.prototype.Update = function (dt, parentMatrix) {
        this.glows && this.glows.Update(dt), this._parentTransform = parentMatrix
    }, EveBoosterBatch.prototype.Commit = function (overrideEffect) {
        this.boosters.Render(overrideEffect)
    }, EveBoosterSet.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (this.display && mode == device.RM_ADDITIVE) {
            if (this.effect && this._boosterTransforms.length) {
                var batch = new EveBoosterBatch;
                mat4.transpose(this._parentTransform, this._perObjectData.perObjectVSData.Get("WorldMat")), this._perObjectData.perObjectVSData.Set("Shipdata", perObjectData.perObjectVSData.Get("Shipdata")), this._perObjectData.perObjectPSData = perObjectData.perObjectPSData, batch.perObjectData = this._perObjectData, batch.boosters = this, batch.renderMode = device.RM_ADDITIVE, accumulator.Commit(batch)
            }
            this.glows && this.glows.GetBatches(mode, accumulator, perObjectData)
        }
    }, EveBoosterSet.prototype.Render = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.effect : overrideEffect,
            effectRes = effect.GetEffectRes();
        if (!effectRes.IsGood()) return !1;
        device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._positions);
        for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
            if (effect.ApplyPass(pass), !this._decl.SetDeclaration(effect.GetPassInput(pass), 104)) return !1;
            device.ApplyShadowState(), device.gl.drawArrays(device.gl.TRIANGLES, 0, 8 * this._boosterTransforms.length * 3)
        }
        return !0
    }, EveSpriteSet.prototype.Initialize = function () {
        this.RebuildBuffers()
    }, EveSpriteSet.prototype.RebuildBuffers = function () {
        for (var vertexSize = 13, array = new Float32Array(4 * this.sprites.length * vertexSize), i = 0; i < this.sprites.length; ++i) {
            var offset = 4 * i * vertexSize;
            array[offset + 0 * vertexSize] = 0, array[offset + 1 * vertexSize] = 1, array[offset + 2 * vertexSize] = 2, array[offset + 3 * vertexSize] = 3;
            for (var j = 0; 4 > j; ++j) {
                var vtxOffset = offset + j * vertexSize;
                array[vtxOffset + 1] = this.sprites[i].boneIndex, array[vtxOffset + 2] = this.sprites[i].position[0], array[vtxOffset + 3] = this.sprites[i].position[1], array[vtxOffset + 4] = this.sprites[i].position[2], array[vtxOffset + 5] = this.sprites[i].color[0], array[vtxOffset + 6] = this.sprites[i].color[1], array[vtxOffset + 7] = this.sprites[i].color[2], array[vtxOffset + 8] = this.sprites[i].blinkPhase, array[vtxOffset + 9] = this.sprites[i].blinkRate, array[vtxOffset + 10] = this.sprites[i].minScale, array[vtxOffset + 11] = this.sprites[i].maxScale, array[vtxOffset + 12] = this.sprites[i].falloff
            }
        }
        this._vertexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._vertexBuffer), device.gl.bufferData(device.gl.ARRAY_BUFFER, array, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, null);
        for (var indexes = new Uint16Array(6 * this.sprites.length), i = 0; i < this.sprites.length; ++i) {
            var offset = 6 * i,
                vtxOffset = 4 * i;
            indexes[offset] = vtxOffset, indexes[offset + 1] = vtxOffset + 2, indexes[offset + 2] = vtxOffset + 1, indexes[offset + 3] = vtxOffset + 0, indexes[offset + 4] = vtxOffset + 3, indexes[offset + 5] = vtxOffset + 2
        }
        this._indexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer), device.gl.bufferData(device.gl.ELEMENT_ARRAY_BUFFER, indexes, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, null), this._indexBuffer.count = 6 * this.sprites.length
    }, EveSpriteSetBatch.prototype.Commit = function (overrideEffect) {
        this.spriteSet.Render(overrideEffect)
    }, Inherit(EveSpriteSetBatch, Tw2RenderBatch), EveSpriteSet.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (mode == device.RM_ADDITIVE) {
            var batch = new EveSpriteSetBatch;
            batch.renderMode = device.RM_ADDITIVE, batch.spriteSet = this, batch.perObjectData = perObjectData, accumulator.Commit(batch)
        }
    }, EveSpriteSet.prototype.Render = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.effect : overrideEffect;
        if (effect && this._vertexBuffer) {
            var effectRes = effect.GetEffectRes();
            if (effectRes.IsGood()) {
                device.SetStandardStates(device.RM_ADDITIVE), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._vertexBuffer), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
                for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
                    if (effect.ApplyPass(pass), !this._decl.SetDeclaration(effect.GetPassInput(pass), 52)) return;
                    device.ApplyShadowState(), device.gl.drawElements(device.gl.TRIANGLES, this._indexBuffer.count, device.gl.UNSIGNED_SHORT, 0)
                }
            }
        }
    }, EveSpriteSet.prototype.Update = function (dt) {
        this._time += dt
    }, EveSpriteSet.prototype.Clear = function () {
        this.sprites = []
    }, EveSpriteSet.prototype.Add = function (pos, blinkRate, blinkPhase, minScale, maxScale, falloff, color) {
        var item = new EveSpriteSetItem;
        item.position = vec3.create(pos), item.blinkRate = blinkRate, item.blinkPhase = blinkPhase, item.minScale = minScale, item.maxScale = maxScale, item.falloff = falloff, item.color = color, this.sprites[this.sprites.length] = item
    }, EveSpotlightSet.prototype.Initialize = function () {
        this.Rebuild()
    }, EveSpotlightSet.prototype.Rebuild = function () {
        var itemCount = this.spotlightItems.length;
        if (0 != itemCount) {
            for (var vertCount = 4, coneQuadCount = 4, coneVertexCount = itemCount * coneQuadCount * vertCount, vertexSize = 22, array = new Float32Array(coneVertexCount * vertexSize), indexes = [1, 0, 2, 3], i = 0; itemCount > i; ++i)
                for (var item = this.spotlightItems[i], q = 0; coneQuadCount > q; ++q)
                    for (var v = 0; vertCount > v; ++v) {
                        var offset = (i * coneQuadCount * vertCount + vertCount * q + v) * vertexSize;
                        array[offset] = item.coneColor[0], array[offset + 1] = item.coneColor[1], array[offset + 2] = item.coneColor[2], array[offset + 3] = item.coneColor[3], array[offset + 4] = item.transform[0], array[offset + 5] = item.transform[4], array[offset + 6] = item.transform[8], array[offset + 7] = item.transform[12], array[offset + 8] = item.transform[1], array[offset + 9] = item.transform[5], array[offset + 10] = item.transform[9], array[offset + 11] = item.transform[13], array[offset + 12] = item.transform[2], array[offset + 13] = item.transform[6], array[offset + 14] = item.transform[10], array[offset + 15] = item.transform[14], array[offset + 16] = 1, array[offset + 17] = 1, array[offset + 18] = 1, array[offset + 19] = q * vertCount + indexes[v], array[offset + 20] = item.boneIndex, array[offset + 21] = item.boosterGainInfluence ? 255 : 0
                    }
            this._coneVertexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._coneVertexBuffer), device.gl.bufferData(device.gl.ARRAY_BUFFER, array, device.gl.STATIC_DRAW), this._coneVertexBuffer.count = itemCount * coneQuadCount * 6;
            var spriteQuadCount = 2,
                spriteVertexCount = itemCount * spriteQuadCount * vertCount;
            array = new Float32Array(spriteVertexCount * vertexSize);
            for (var indexes = [1, 0, 2, 3], i = 0; itemCount > i; ++i)
                for (var item = this.spotlightItems[i], q = 0; spriteQuadCount > q; ++q)
                    for (var v = 0; vertCount > v; ++v) {
                        var offset = (i * spriteQuadCount * vertCount + vertCount * q + v) * vertexSize;
                        q % 2 == 0 ? (array[offset] = item.spriteColor[0], array[offset + 1] = item.spriteColor[1], array[offset + 2] = item.spriteColor[2], array[offset + 3] = item.spriteColor[3], array[offset + 16] = item.spriteScale[0], array[offset + 17] = 1, array[offset + 18] = 1) : (array[offset] = item.flareColor[0], array[offset + 1] = item.flareColor[1], array[offset + 2] = item.flareColor[2], array[offset + 3] = item.flareColor[3], array[offset + 16] = 1, array[offset + 17] = item.spriteScale[1], array[offset + 18] = item.spriteScale[2]), array[offset + 4] = item.transform[0], array[offset + 5] = item.transform[4], array[offset + 6] = item.transform[8], array[offset + 7] = item.transform[12], array[offset + 8] = item.transform[1], array[offset + 9] = item.transform[5], array[offset + 10] = item.transform[9], array[offset + 11] = item.transform[13], array[offset + 12] = item.transform[2], array[offset + 13] = item.transform[6], array[offset + 14] = item.transform[10], array[offset + 15] = item.transform[14], array[offset + 19] = q * vertCount + indexes[v], array[offset + 20] = item.boneIndex, array[offset + 21] = item.boosterGainInfluence ? 255 : 0
                    }
            this._spriteVertexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._spriteVertexBuffer), device.gl.bufferData(device.gl.ARRAY_BUFFER, array, device.gl.STATIC_DRAW), this._spriteVertexBuffer.count = itemCount * spriteQuadCount * 6;
            for (var indexes = new Uint16Array(itemCount * coneQuadCount * 6), i = 0; itemCount * coneQuadCount > i; ++i) {
                var offset = 6 * i,
                    vtxOffset = 4 * i;
                indexes[offset] = vtxOffset, indexes[offset + 1] = vtxOffset + 1, indexes[offset + 2] = vtxOffset + 2, indexes[offset + 3] = vtxOffset + 2, indexes[offset + 4] = vtxOffset + 3, indexes[offset + 5] = vtxOffset + 0
            }
            this._indexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer), device.gl.bufferData(device.gl.ELEMENT_ARRAY_BUFFER, indexes, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, null)
        }
    }, EveSpotlightSetBatch.prototype.Commit = function (overrideEffect) {
        this.spotlightSet.RenderCones(overrideEffect), this.spotlightSet.RenderGlow(overrideEffect)
    }, Inherit(EveSpotlightSetBatch, Tw2RenderBatch), EveSpotlightSet.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (this.display && mode == device.RM_ADDITIVE) {
            var batch = new EveSpotlightSetBatch;
            batch.renderMode = device.RM_ADDITIVE, batch.spotlightSet = this, batch.perObjectData = perObjectData, accumulator.Commit(batch)
        }
    }, EveSpotlightSet.prototype.RenderCones = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.coneEffect : overrideEffect;
        this._Render(effect, this._coneVertexBuffer)
    }, EveSpotlightSet.prototype.RenderGlow = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.glowEffect : overrideEffect;
        this._Render(effect, this._spriteVertexBuffer)
    }, EveSpotlightSet.prototype._Render = function (effect, buffer) {
        if (effect && buffer && this._indexBuffer) {
            var effectRes = effect.GetEffectRes();
            if (effectRes.IsGood()) {
                device.SetStandardStates(device.RM_ADDITIVE), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, buffer);
                var stride = 88;
                device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
                for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
                    if (effect.ApplyPass(pass), !this._decl.SetDeclaration(effect.GetPassInput(pass), stride)) return;
                    device.ApplyShadowState(), device.gl.drawElements(device.gl.TRIANGLES, buffer.count, device.gl.UNSIGNED_SHORT, 0)
                }
            }
        }
    }, EvePlaneSet.prototype.Initialize = function () {
        this.RebuildBuffers()
    }, EvePlaneSet.prototype.RebuildBuffers = function () {
        for (var vertexSize = 38, array = new Float32Array(4 * this.planes.length * vertexSize), i = 0; i < this.planes.length; ++i) {
            var offset = 4 * i * vertexSize;
            array[offset + 0 * vertexSize + vertexSize - 2] = 0, array[offset + 1 * vertexSize + vertexSize - 2] = 1, array[offset + 2 * vertexSize + vertexSize - 2] = 2, array[offset + 3 * vertexSize + vertexSize - 2] = 3;
            var itemTransform = mat4.transpose(quat4.toMat4(this.planes[i].rotation));
            itemTransform[12] = this.planes[i].position[0], itemTransform[13] = this.planes[i].position[1], itemTransform[14] = this.planes[i].position[2];
            for (var j = 0; 4 > j; ++j) {
                var vtxOffset = offset + j * vertexSize;
                array[vtxOffset + 0] = itemTransform[0], array[vtxOffset + 1] = itemTransform[4], array[vtxOffset + 2] = itemTransform[8], array[vtxOffset + 3] = itemTransform[12], array[vtxOffset + 4] = itemTransform[1], array[vtxOffset + 5] = itemTransform[5], array[vtxOffset + 6] = itemTransform[9], array[vtxOffset + 7] = itemTransform[13], array[vtxOffset + 8] = itemTransform[2], array[vtxOffset + 9] = itemTransform[6], array[vtxOffset + 10] = itemTransform[10], array[vtxOffset + 11] = itemTransform[14], array[vtxOffset + 12] = this.planes[i].color[0], array[vtxOffset + 13] = this.planes[i].color[1], array[vtxOffset + 14] = this.planes[i].color[2], array[vtxOffset + 15] = this.planes[i].color[3], array[vtxOffset + 16] = this.planes[i].layer1Transform[0], array[vtxOffset + 17] = this.planes[i].layer1Transform[1], array[vtxOffset + 18] = this.planes[i].layer1Transform[2], array[vtxOffset + 19] = this.planes[i].layer1Transform[3], array[vtxOffset + 20] = this.planes[i].layer2Transform[0], array[vtxOffset + 21] = this.planes[i].layer2Transform[1], array[vtxOffset + 22] = this.planes[i].layer2Transform[2], array[vtxOffset + 23] = this.planes[i].layer2Transform[3], array[vtxOffset + 24] = this.planes[i].layer1Scroll[0], array[vtxOffset + 25] = this.planes[i].layer1Scroll[1], array[vtxOffset + 26] = this.planes[i].layer1Scroll[2], array[vtxOffset + 27] = this.planes[i].layer1Scroll[3], array[vtxOffset + 28] = this.planes[i].layer2Scroll[0], array[vtxOffset + 29] = this.planes[i].layer2Scroll[1], array[vtxOffset + 30] = this.planes[i].layer2Scroll[2], array[vtxOffset + 31] = this.planes[i].layer2Scroll[3], array[vtxOffset + 32] = this.planes[i].scaling[0], array[vtxOffset + 33] = this.planes[i].scaling[1], array[vtxOffset + 34] = this.planes[i].scaling[2], array[vtxOffset + 35] = 0, array[vtxOffset + 37] = this.boneIndex
            }
        }
        this._vertexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._vertexBuffer), device.gl.bufferData(device.gl.ARRAY_BUFFER, array, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, null);
        for (var indexes = new Uint16Array(6 * this.planes.length), i = 0; i < this.planes.length; ++i) {
            var offset = 6 * i,
                vtxOffset = 4 * i;
            indexes[offset] = vtxOffset, indexes[offset + 1] = vtxOffset + 2, indexes[offset + 2] = vtxOffset + 1, indexes[offset + 3] = vtxOffset + 0, indexes[offset + 4] = vtxOffset + 3, indexes[offset + 5] = vtxOffset + 2
        }
        this._indexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer), device.gl.bufferData(device.gl.ELEMENT_ARRAY_BUFFER, indexes, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, null), this._indexBuffer.count = 6 * this.planes.length
    }, EvePlaneSetBatch.prototype.Commit = function (overrideEffect) {
        this.planeSet.Render(overrideEffect)
    }, Inherit(EvePlaneSetBatch, Tw2RenderBatch), EvePlaneSet.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (this.display && mode == device.RM_ADDITIVE) {
            var batch = new EvePlaneSetBatch;
            batch.renderMode = device.RM_ADDITIVE, batch.planeSet = this, batch.perObjectData = perObjectData, accumulator.Commit(batch)
        }
    }, EvePlaneSet.prototype.Render = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.effect : overrideEffect;
        if (effect && this._vertexBuffer) {
            var effectRes = effect.GetEffectRes();
            if (effectRes.IsGood()) {
                device.SetStandardStates(device.RM_ADDITIVE), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._vertexBuffer), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer);
                for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
                    if (effect.ApplyPass(pass), !this._decl.SetDeclaration(effect.GetPassInput(pass), 152)) return;
                    device.ApplyShadowState(), device.gl.drawElements(device.gl.TRIANGLES, this._indexBuffer.count, device.gl.UNSIGNED_SHORT, 0)
                }
            }
        }
    }, EvePlaneSet.prototype.Update = function (dt) {
        this._time += dt
    }, EvePlaneSet.prototype.Clear = function () {
        this.planes = []
    }, EveBasicPerObjectData.prototype.SetPerObjectDataToDevice = function (constantBufferHandles) {
        this.perObjectVSData && constantBufferHandles[3] && device.gl.uniform4fv(constantBufferHandles[3], this.perObjectVSData.data), this.perObjectPSData && constantBufferHandles[4] && device.gl.uniform4fv(constantBufferHandles[4], this.perObjectPSData.data), this.perObjectFFEData && constantBufferHandles[5] && device.gl.uniform4fv(constantBufferHandles[5], this.perObjectFFEData.data)
    }, EveTransform.prototype.Initialize = function () {
        mat4.identity(this.localTransform), mat4.translate(this.localTransform, this.translation), mat4.transpose(quat4.toMat4(this.rotation, this.rotationTransform)), mat4.multiply(this.localTransform, this.rotationTransform, this.localTransform), mat4.scale(this.localTransform, this.scaling)
    }, EveTransform.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (this.display) {
            null != this.mesh && (mat4.transpose(this.worldTransform, this._perObjectData.perObjectFFEData.Get("World")), mat4.inverse(this.worldTransform, this._perObjectData.perObjectFFEData.Get("WorldInverseTranspose")), perObjectData && (this._perObjectData.perObjectVSData = perObjectData.perObjectVSData, this._perObjectData.perObjectPSData = perObjectData.perObjectPSData), this.mesh.GetBatches(mode, accumulator, this._perObjectData));
            for (var i = 0; i < this.children.length; ++i) this.children[i].GetBatches(mode, accumulator, perObjectData)
        }
    }, EveTransform.prototype.Update = function (dt) {
        for (var i = 0; i < this.children.length; ++i) this.children[i].Update(dt);
        for (var i = 0; i < this.particleEmitters.length; ++i) this.particleEmitters[i].Update(dt);
        for (var i = 0; i < this.particleSystems.length; ++i) this.particleSystems[i].Update(dt);
        for (var i = 0; i < this.curveSets.length; ++i) this.curveSets[i].Update(dt)
    }, mat4.multiply3x3 = function (a, b, c) {
        c || (c = b);
        var d = b[0],
            e = b[1];
        return b = b[2], c[0] = a[0] * d + a[4] * e + a[8] * b, c[1] = a[1] * d + a[5] * e + a[9] * b, c[2] = a[2] * d + a[6] * e + a[10] * b, c
    }, EveTransform.prototype.UpdateViewDependentData = function (parentTransform) {
        switch (mat4.identity(this.localTransform), mat4.translate(this.localTransform, this.translation), mat4.transpose(quat4.toMat4(quat4.normalize(this.rotation), this.rotationTransform)), mat4.multiply(this.localTransform, this.rotationTransform, this.localTransform), mat4.scale(this.localTransform, this.scaling), this.modifier) {
            case this.BILLBOARD:
            case this.SIMPLE_HALO:
                mat4.multiply(parentTransform, this.localTransform, this.worldTransform);
                var finalScale = this._vec3Cache[0];
                vec3.set(this.scaling, finalScale);
                var parentScaleX = vec3.length(parentTransform),
                    parentScaleY = vec3.length(parentTransform.subarray(4)),
                    parentScaleZ = vec3.length(parentTransform.subarray(8));
                if (finalScale[0] *= parentScaleX, finalScale[1] *= parentScaleY, finalScale[2] *= parentScaleZ, this.modifier == this.SIMPLE_HALO) {
                    var camPos = device.GetEyePosition(),
                        d = this._vec3Cache[1];
                    vec3.subtract(camPos, this.worldTransform.subarray(12), d);
                    var scale = vec3.dot(vec3.normalize(d), vec3.normalize(this.worldTransform.subarray(8), this._vec3Cache[2]));
                    0 > scale && (scale = 0), vec3.scale(finalScale, scale * scale)
                }
                var invView = device.viewInv;
                this.worldTransform[0] = invView[0] * finalScale[0], this.worldTransform[1] = invView[1] * finalScale[0], this.worldTransform[2] = invView[2] * finalScale[0], this.worldTransform[4] = invView[4] * finalScale[1], this.worldTransform[5] = invView[5] * finalScale[1], this.worldTransform[6] = invView[6] * finalScale[1], this.worldTransform[8] = invView[8] * finalScale[2], this.worldTransform[9] = invView[9] * finalScale[2], this.worldTransform[10] = invView[10] * finalScale[2];
                break;
            case this.EVE_CAMERA_ROTATION:
                var newTranslation = mat4.multiplyVec3(parentTransform, this.translation, vec3.create());
                mat4.identity(this.localTransform), mat4.translate(this.localTransform, newTranslation), mat4.transpose(quat4.toMat4(this.rotation, this.rotationTransform)), mat4.multiply(this.localTransform, this.rotationTransform, this.localTransform), mat4.scale(this.localTransform, this.scaling);
                var x = this.localTransform[12],
                    y = this.localTransform[13],
                    z = this.localTransform[14];
                mat4.multiply(device.viewInv, this.localTransform, this.worldTransform), this.worldTransform[12] = x, this.worldTransform[13] = y, this.worldTransform[14] = z;
                break;
            case this.EVE_CAMERA_ROTATION_ALIGNED:
            case this.EVE_SIMPLE_HALO:
                mat4.translate(parentTransform, this.translation, this.worldTransform);
                var camPos = device.GetEyePosition(),
                    d = this._vec3Cache[0];
                d[0] = camPos[0] - this.worldTransform[12], d[1] = camPos[1] - this.worldTransform[13], d[2] = camPos[2] - this.worldTransform[14];
                var parentT = this._mat4Cache[0];
                mat4.transpose(parentTransform, parentT);
                var camFwd = this._vec3Cache[1];
                vec3.set(d, camFwd), mat4.multiply3x3(parentT, camFwd);
                var parentScaleX = vec3.length(parentTransform);
                camFwd[0] /= parentScaleX;
                var parentScaleY = vec3.length(parentTransform.subarray(4));
                camFwd[1] /= parentScaleY;
                var parentScaleZ = vec3.length(parentTransform.subarray(8));
                camFwd[2] /= parentScaleZ;
            {
                vec3.length(camFwd)
            }
                vec3.normalize(camFwd);
                var right = this._vec3Cache[2];
                right[0] = device.view[0], right[1] = device.view[4], right[2] = device.view[8], mat4.multiply3x3(parentT, right), vec3.normalize(right);
                var up = this._vec3Cache[3];
                vec3.cross(camFwd, right, up), vec3.normalize(up);
                var alignMat = this._mat4Cache[1];
                if (vec3.cross(up, camFwd, right), alignMat[0] = right[0], alignMat[1] = right[1], alignMat[2] = right[2], alignMat[4] = up[0], alignMat[5] = up[1], alignMat[6] = up[2], alignMat[8] = camFwd[0], alignMat[9] = camFwd[1], alignMat[10] = camFwd[2], alignMat[15] = 1, mat4.multiply(alignMat, this.rotationTransform, alignMat), this.modifier == this.EVE_SIMPLE_HALO) {
                    var forward = this._vec3Cache[4];
                    vec3.normalize(this.worldTransform.subarray(8), forward);
                    var dirToCamNorm = d;
                    vec3.normalize(dirToCamNorm);
                    var scale = -vec3.dot(dirToCamNorm, forward);
                    0 > scale && (scale = 0), mat4.multiply(this.worldTransform, alignMat, this.worldTransform), mat4.scale(this.worldTransform, [this.scaling[0] * scale, this.scaling[1] * scale, this.scaling[2] * scale])
                } else mat4.scale(this.worldTransform, this.scaling), mat4.multiply(this.worldTransform, alignMat, this.worldTransform);
                break;
            case this.LOOK_AT_CAMERA:
                mat4.multiply(parentTransform, this.localTransform, this.worldTransform);
                var invView = this._mat4Cache[0];
                mat4.lookAt(device.viewInv.subarray(12), this.worldTransform.subarray(12), [0, 1, 0], invView), mat4.transpose(invView);
                var finalScale = this._vec3Cache[0];
                vec3.set(this.scaling, finalScale);
                var parentScaleX = vec3.length(parentTransform),
                    parentScaleY = vec3.length(parentTransform.subarray(4)),
                    parentScaleZ = vec3.length(parentTransform.subarray(8));
                finalScale[0] *= parentScaleX, finalScale[1] *= parentScaleY, finalScale[2] *= parentScaleZ, this.worldTransform[0] = invView[0] * finalScale[0], this.worldTransform[1] = invView[1] * finalScale[0], this.worldTransform[2] = invView[2] * finalScale[0], this.worldTransform[4] = invView[4] * finalScale[1], this.worldTransform[5] = invView[5] * finalScale[1], this.worldTransform[6] = invView[6] * finalScale[1], this.worldTransform[8] = invView[8] * finalScale[2], this.worldTransform[9] = invView[9] * finalScale[2], this.worldTransform[10] = invView[10] * finalScale[2];
                break;
            default:
                mat4.multiply(parentTransform, this.localTransform, this.worldTransform)
        }
        for (var i = 0; i < this.children.length; ++i) this.children[i].UpdateViewDependentData(this.worldTransform)
    }, EveTurretSet.positionBoneSkeletonNames = ["Pos_Fire01", "Pos_Fire02", "Pos_Fire03", "Pos_Fire04", "Pos_Fire05", "Pos_Fire06", "Pos_Fire07", "Pos_Fire08"], EveTurretSet.prototype.Initialize = function () {
        if (this.turretEffect && "" != this.geometryResPath && (this.geometryResource = resMan.GetResource(this.geometryResPath), this.activeAnimation.SetGeometryResource(this.geometryResource), this.inactiveAnimation.SetGeometryResource(this.geometryResource), this.geometryResource && this.geometryResource.RegisterNotification(this)), "" != this.firingEffectResPath) {
            var self = this;
            resMan.GetObject(this.firingEffectResPath, function (object) {
                self.firingEffect = object
            })
        }
    }, EveTurretSet.prototype.RebuildCachedData = function () {
        for (var instancedElement = new Tw2VertexElement(Tw2VertexDeclaration.DECL_TEXCOORD, 1, device.gl.FLOAT, 2), i = 0; i < this.geometryResource.meshes.length; ++i) this.geometryResource.meshes[i].declaration.elements.push(instancedElement), this.geometryResource.meshes[i].declaration.RebuildHash();
        var self = this;
        switch (this.state) {
            case this.STATE_INACTIVE:
                this.activeAnimation.PlayAnimation("Inactive", !0), this.inactiveAnimation.PlayAnimation("Inactive", !0);
                break;
            case this.STATE_IDLE:
                this.activeAnimation.PlayAnimation("Active", !0), this.inactiveAnimation.PlayAnimation("Active", !0);
                break;
            case this.STATE_FIRING:
                this.activeAnimation.PlayAnimation("Fire", !1, function () {
                    self.activeAnimation.PlayAnimation("Active", !0)
                }), this.inactiveAnimation.PlayAnimation("Active", !0);
                break;
            case this.STATE_PACKING:
                this.EnterStateIdle();
                break;
            case this.STATE_UNPACKING:
                this.EnterStateDeactive()
        }
    }, EveTurretSet.prototype.InitializeFiringEffect = function () {
        if (this.firingEffect && this.geometryResource && this.geometryResource.models.length)
            for (var model = this.geometryResource.models[0], i = 0; i < this.firingEffect.GetPerMuzzleEffectCount(); ++i) this.firingEffect.SetMuzzleBoneID(i, model.FindBoneByName(EveTurretSet.positionBoneSkeletonNames[i]))
    }, EveTurretSet.prototype.SetLocalTransform = function (index, localTransform) {
        if (index >= this.turrets.length) {
            var data = new EveTurretData;
            data.localTransform = localTransform, this.turrets[index] = data
        } else this.turrets[index].localTransform = localTransform
    }, EveTurretSet.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (!this.turretEffect || null == this.geometryResource || !this.display) return !1;
        if (mode == device.RM_OPAQUE) {
            var transforms = this.inactiveAnimation.GetBoneMatrixes(0);
            if (0 == transforms.length) return !0;
            mat4.identity(this._perObjectDataInactive.perObjectVSData.Get("shipMatrix")), this._perObjectDataInactive.perObjectVSData.Get("clipData")[0] = this.bottomClipHeight, this._perObjectDataInactive.perObjectVSData.Set("turretPose0", transforms), this._perObjectDataInactive.perObjectVSData.Set("turretPose1", transforms), this._perObjectDataInactive.perObjectVSData.Set("turretPose2", transforms);
            for (var i = 0; i < this.turrets.length; ++i) mat4.transpose(this.turrets[i].worldTransform, this._perObjectDataInactive.perObjectVSData.Get(this.worldNames[i]));
            this._perObjectDataInactive.perObjectPSData = perObjectData.perObjectPSData;
            var batch = new Tw2ForwardingRenderBatch;
            if (batch.renderActive = !1, batch.perObjectData = this._perObjectDataInactive, batch.geometryProvider = this, accumulator.Commit(batch), this.state == this.STATE_FIRING) {
                var transforms = this.activeAnimation.GetBoneMatrixes(0);
                if (0 == transforms.length) return !0;
                mat4.identity(this._perObjectDataActive.perObjectVSData.Get("shipMatrix")), this._perObjectDataActive.perObjectVSData.Get("clipData")[0] = this.bottomClipHeight, this._perObjectDataActive.perObjectVSData.Set("turretPose0", transforms), this._perObjectDataActive.perObjectVSData.Set("turretPose1", transforms), this._perObjectDataActive.perObjectVSData.Set("turretPose2", transforms);
                for (var i = 0; i < this.turrets.length; ++i) mat4.transpose(this.turrets[i].worldTransform, this._perObjectDataActive.perObjectVSData.Get(this.worldNames[i]));
                this._perObjectDataActive.perObjectPSData = perObjectData.perObjectPSData;
                var batch = new Tw2ForwardingRenderBatch;
                batch.renderActive = !0, batch.perObjectData = this._perObjectDataActive, batch.geometryProvider = this, accumulator.Commit(batch)
            }
        }
        return this.firingEffect && this.firingEffect.GetBatches(mode, accumulator, perObjectData), !0
    }, EveTurretSet.prototype.Update = function (dt, parentMatrix) {
        this.turretEffect && (this.activeAnimation.Update(dt), this.inactiveAnimation.Update(dt));
        for (var i = 0; i < this.turrets.length; ++i) mat4.multiply(parentMatrix, this.turrets[i].localTransform, this.turrets[i].worldTransform);
        if (this.firingEffect) {
            if (-1 != this._activeTurret)
                if (this.firingEffect.isLoopFiring && this.state == this.STATE_FIRING && (this._recheckTimeLeft -= dt, this._recheckTimeLeft <= 0 && this._DoStartFiring()), this.activeAnimation.models.length)
                    for (var bones = this.activeAnimation.models[0].bonesByName, i = 0; i < this.firingEffect.GetPerMuzzleEffectCount(); ++i) {
                        var transform = bones[EveTurretSet.positionBoneSkeletonNames[i]].worldTransform;
                        mat4.multiply(this.turrets[this._activeTurret].worldTransform, transform, this.firingEffect.GetMuzzleTransform(i))
                    } else
                    for (var i = 0; i < this.firingEffect.GetPerMuzzleEffectCount(); ++i) mat4.set(this.turrets[this._activeTurret].worldTransform, this.firingEffect.GetMuzzleTransform(i));
            vec3.set(this.targetPosition, this.firingEffect.endPosition), this.firingEffect.Update(dt)
        }
    }, EveTurretSet.prototype.Render = function (batch, overrideEffect) {
        for (var effect = "undefined" == typeof overrideEffect ? this.turretEffect : overrideEffect, index = 0, customSetter = function (el) {
            device.gl.disableVertexAttribArray(el.location), device.gl.vertexAttrib2f(el.location, index, index)
        }, i = 0; i < this.geometryResource.meshes.length; ++i) {
            var decl = this.geometryResource.meshes[i].declaration;
            decl.FindUsage(Tw2VertexDeclaration.DECL_TEXCOORD, 1).customSetter = customSetter
        }
        for (; index < this.turrets.length; ++index) {
            var isActive = this.state == this.STATE_FIRING && index == this._activeTurret;
            batch.renderActive == isActive && this.geometryResource.RenderAreas(0, 0, 1, effect)
        }
    }, EveTurretSet.prototype.EnterStateDeactive = function () {
        if (this.state != this.STATE_INACTIVE && this.state != this.STATE_PACKING) {
            var self = this;
            this.turretEffect ? (this.activeAnimation.StopAllAnimations(), this.inactiveAnimation.StopAllAnimations(), this.activeAnimation.PlayAnimation("Pack", !1, function () {
                self.state = self.STATE_INACTIVE, self.activeAnimation.PlayAnimation("Inactive", !0)
            }), this.inactiveAnimation.PlayAnimation("Pack", !1, function () {
                self.state = self.STATE_INACTIVE, self.inactiveAnimation.PlayAnimation("Inactive", !0)
            }), this.state = this.STATE_PACKING) : this.state = self.STATE_INACTIVE, this._activeTurret = -1, this.firingEffect && this.firingEffect.StopFiring()
        }
    }, EveTurretSet.prototype.EnterStateIdle = function () {
        if (this.state != this.STATE_IDLE && this.state != this.STATE_UNPACKING) {
            if (this.turretEffect) {
                if (this.activeAnimation.StopAllAnimations(), this.inactiveAnimation.StopAllAnimations(), this.state == this.STATE_FIRING) this.activeAnimation.PlayAnimation("Active", !0), this.inactiveAnimation.PlayAnimation("Active", !0);
                else {
                    var self = this;
                    this.activeAnimation.PlayAnimation("Deploy", !1, function () {
                        self.state = self.STATE_IDLE, self.activeAnimation.PlayAnimation("Active", !0)
                    }), this.inactiveAnimation.PlayAnimation("Deploy", !1, function () {
                        self.state = self.STATE_IDLE, self.inactiveAnimation.PlayAnimation("Active", !0)
                    })
                }
                this.state = this.STATE_UNPACKING
            } else this.state = self.STATE_IDLE;
            this._activeTurret = -1, this.firingEffect && this.firingEffect.StopFiring()
        }
    }, EveTurretSet.prototype.EnterStateFiring = function () {
        if (this.turretEffect && this.state != this.STATE_FIRING)
            if (this.activeAnimation.StopAllAnimations(), this.inactiveAnimation.StopAllAnimations(), this.state == this.STATE_INACTIVE) {
                var self = this;
                this.activeAnimation.PlayAnimation("Deploy", !1, function () {
                    self._DoStartFiring(), self.activeAnimation.PlayAnimation("Fire", !1, function () {
                        self.activeAnimation.PlayAnimation("Active", !0)
                    })
                }), this.inactiveAnimation.PlayAnimation("Deploy", !1, function () {
                    self.inactiveAnimation.PlayAnimation("Active", !0)
                }), this.state = this.STATE_UNPACKING
            } else {
                this._DoStartFiring();
                var self = this;
                this.activeAnimation.PlayAnimation("Fire", !1, function () {
                    self.activeAnimation.PlayAnimation("Active", !0)
                }), this.inactiveAnimation.PlayAnimation("Active", !0)
            } else if (this._DoStartFiring(), this.turretEffect) {
            var self = this;
            this.activeAnimation.PlayAnimation("Fire", !1, function () {
                self.activeAnimation.PlayAnimation("Active", !0)
            })
        }
    }, EveTurretSet.prototype.UpdateViewDependentData = function () {
        this.firingEffect && this.firingEffect.UpdateViewDependentData()
    }, EveTurretSet.prototype._DoStartFiring = function () {
        this.hasCyclingFiringPos && (this._currentCyclingFiresPos = 1 - this._currentCyclingFiresPos);
        var turret = this.GetClosestTurret();
        this.firingEffect && this.firingEffect.PrepareFiring(0, this.hasCyclingFiringPos ? this._currentCyclingFiresPos : -1), this._activeTurret = turret, this.state = this.STATE_FIRING, this._recheckTimeLeft = 2
    }, EveTurretSet._tempVec3 = [vec3.create(), vec3.create()], EveTurretSet._tempQuat4 = [quat4.create()], EveTurretSet.prototype.GetClosestTurret = function () {
        for (var closestTurret = -1, closestAngle = -2, nrmToTarget = EveTurretSet._tempVec3[0], nrmUp = EveTurretSet._tempQuat4[0], turretPosition = EveTurretSet._tempVec3[1], i = 0; i < this.turrets.length; ++i) {
            turretPosition[0] = this.turrets[i].worldTransform[12], turretPosition[1] = this.turrets[i].worldTransform[13], turretPosition[2] = this.turrets[i].worldTransform[14], vec3.normalize(vec3.subtract(this.targetPosition, turretPosition, nrmToTarget)), nrmUp[0] = 0, nrmUp[1] = 1, nrmUp[2] = 0, nrmUp[3] = 0, mat4.multiplyVec4(this.turrets[i].worldTransform, nrmUp);
            var angle = vec3.dot(nrmUp, nrmToTarget);
            angle > closestAngle && (closestTurret = i, closestAngle = angle)
        }
        return closestTurret
    }, EveSpaceObject.prototype.Initialize = function () {
        if (this.mesh) {
            this.animation.SetGeometryResource(this.mesh.geometryResource);
            for (var i = 0; i < this.decals.length; ++i) this.decals[i].SetParentGeometry(this.mesh.geometryResource)
        }
    }, EveSpaceObject.prototype.ResetLod = function () {
        this.lod = 3
    }, EveSpaceObject.prototype.UpdateLod = function (frustum) {
        var center = mat4.multiplyVec3(this.transform, this.boundingSphereCenter, this._tempVec);
        this.lod = frustum.IsSphereVisible(center, this.boundingSphereRadius) ? frustum.GetPixelSizeAccross(center, this.boundingSphereRadius) < 100 ? 1 : 2 : 0
    }, EveSpaceObject.prototype.UpdateViewDependentData = function () {
        for (var i = 0; i < this.children.length; ++i) this.children[i].UpdateViewDependentData(this.transform);
        mat4.transpose(this.transform, this._perObjectData.perObjectVSData.Get("WorldMat")), this.animation.animations.length && this._perObjectData.perObjectVSData.Set("JointMat", this.animation.GetBoneMatrixes(0))
    }, EveSpaceObject.prototype.GetBatches = function (mode, accumulator) {
        if (null != this.mesh && this.lod > 0 && this.mesh.GetBatches(mode, accumulator, this._perObjectData), this.lod > 1) {
            for (var i = 0; i < this.spriteSets.length; ++i) this.spriteSets[i].GetBatches(mode, accumulator, this._perObjectData);
            for (var i = 0; i < this.spotlightSets.length; ++i) this.spotlightSets[i].GetBatches(mode, accumulator, this._perObjectData);
            for (var i = 0; i < this.planeSets.length; ++i) this.planeSets[i].GetBatches(mode, accumulator, this._perObjectData);
            for (var i = 0; i < this.decals.length; ++i) this.decals[i].GetBatches(mode, accumulator, this._perObjectData)
        }
        for (var i = 0; i < this.children.length; ++i) this.children[i].GetBatches(mode, accumulator, this._perObjectData)
    }, EveSpaceObject.prototype.Update = function (dt) {
        if (this.lod > 0) {
            for (var i = 0; i < this.spriteSets.length; ++i) this.spriteSets[i].Update(dt);
            for (var i = 0; i < this.children.length; ++i) this.children[i].Update(dt);
            for (var i = 0; i < this.curveSets.length; ++i) this.curveSets[i].Update(dt);
            this.animation.Update(dt)
        }
    }, EveSpaceObject.prototype.GetLocatorCount = function (prefix) {
        for (var count = 0, i = 0; i < this.locators.length; ++i) this.locators[i].name.substr(0, prefix.length) == prefix && ++count;
        return count
    }, EveSpaceObject.prototype.FindLocatorJointByName = function (name) {
        var model = this.animation.FindModelForMesh(0);
        if (null != model)
            for (var i = 0; i < model.bones.length; ++i)
                if (model.bones[i].boneRes.name == name) return model.bones[i].worldTransform;
        return null
    }, EveSpaceObject.prototype.FindLocatorTransformByName = function (name) {
        for (var i = 0; i < this.locators.length; ++i)
            if (this.locators[i].name == name) return this.locators[i].transform;
        return null
    }, EveSpaceObject.prototype.RenderDebugInfo = function (debugHelper) {
        this.animation.RenderDebugInfo(debugHelper)
    }, EveStation = EveSpaceObject, EveShip.prototype.Initialize = function () {
        this._super.Initialize.call(this), this.boosters && this.RebuildBoosterSet()
    }, EveShip.prototype.GetBatches = function (mode, accumulator) {
        if (this._super.GetBatches.call(this, mode, accumulator), this._perObjectData.perObjectVSData.Get("Shipdata")[0] = this.boosterGain, this._perObjectData.perObjectPSData.Get("Shipdata")[0] = this.boosterGain, this.lod > 1)
            for (var i = 0; i < this.turretSets.length; ++i) this.turretSets[i].GetBatches(mode, accumulator, this._perObjectData);
        else
            for (var i = 0; i < this.turretSets.length; ++i) this.turretSets[i].firingEffect && this.turretSets[i].firingEffect.GetBatches(mode, accumulator, this._perObjectData);
        this.boosters && this.boosters.GetBatches(mode, accumulator, this._perObjectData)
    }, EveShip.prototype.Update = function (dt) {
        this._super.Update.call(this, dt), this.boosters && (this.boosters.rebuildPending && this.RebuildBoosterSet(), this.boosters.Update(dt, this.transform));
        for (var i = 0; i < this.turretSets.length; ++i)
            if (i < this._turretSetsLocatorInfo.length && this._turretSetsLocatorInfo[i].isJoint)
                for (var j = 0; j < this._turretSetsLocatorInfo[i].locatorTransforms.length; ++j) this.turretSets[i].SetLocalTransform(j, this._turretSetsLocatorInfo[i].locatorTransforms[j]);
        for (var i = 0; i < this.turretSets.length; ++i) this.turretSets[i].Update(dt, this.transform)
    }, EveShip.prototype.UpdateViewDependentData = function () {
        EveSpaceObject.prototype.UpdateViewDependentData.call(this);
        for (var i = 0; i < this.turretSets.length; ++i) this.turretSets[i].UpdateViewDependentData()
    }, EveShip.prototype.RebuildBoosterSet = function () {
        if (this.boosters) {
            this.boosters.Clear();
            for (var prefix = "locator_booster", i = 0; i < this.locators.length; ++i) this.locators[i].name.substr(0, prefix.length) == prefix && this.boosters.Add(this.locators[i].transform);
            this.boosters.Rebuild()
        }
    }, EveShip.prototype.RebuildTurretPositions = function () {
        this._turretSetsLocatorInfo = [];
        for (var i = 0; i < this.turretSets.length; ++i) {
            for (var name = this.turretSets[i].locatorName, locatorCount = this.GetLocatorCount(name), locator = new EveTurretSetLocatorInfo, j = 0; locatorCount > j; ++j) {
                var locatorName = name + String.fromCharCode("a".charCodeAt(0) + j),
                    locatorTransform = this.FindLocatorJointByName(locatorName);
                null != locatorTransform ? locator.isJoint = !0 : locatorTransform = this.FindLocatorTransformByName(locatorName), null != locatorTransform && (this.turretSets[i].SetLocalTransform(j, locatorTransform), locator.locatorTransforms[locator.locatorTransforms.length] = locatorTransform)
            }
            this._turretSetsLocatorInfo[this._turretSetsLocatorInfo.length] = locator
        }
    }, Inherit(EveShip, EveSpaceObject), EveSpaceObjectDecal.prototype.Initialize = function () {
        var indexes = new Uint16Array(this.indexBuffer);
        this._indexBuffer = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._indexBuffer), device.gl.bufferData(device.gl.ELEMENT_ARRAY_BUFFER, indexes, device.gl.STATIC_DRAW), mat4.scale(mat4.transpose(quat4.toMat4(this.rotation, this.decalMatrix)), this.scaling), this.decalMatrix[12] = this.position[0], this.decalMatrix[13] = this.position[1], this.decalMatrix[14] = this.position[2], mat4.inverse(this.decalMatrix, this.invDecalMatrix)
    }, EveSpaceObjectDecal.prototype.SetParentGeometry = function (geometryRes) {
        this.parentGeometry = geometryRes
    }, EveSpaceObjectDecal.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (mode == device.RM_DECAL && this.display && this.indexBuffer.length && this.decalEffect && this.parentGeometry && this.parentGeometry.IsGood()) {
            var batch = new Tw2ForwardingRenderBatch;
            if (this._perObjectData.perObjectVSData.Set("worldMatrix", perObjectData.perObjectVSData.Get("WorldMat")), this.parentBoneIndex >= 0) {
                var bones = perObjectData.perObjectVSData.Get("JointMat"),
                    offset = 12 * this.parentBoneIndex,
                    bone = this._perObjectData.perObjectVSData.Get("parentBoneMatrix");
                bone[0] = bones[offset + 0], bone[1] = bones[offset + 4], bone[2] = bones[offset + 8], bone[3] = 0, bone[4] = bones[offset + 1], bone[5] = bones[offset + 5], bone[6] = bones[offset + 9], bone[7] = 0, bone[8] = bones[offset + 2], bone[9] = bones[offset + 6], bone[10] = bones[offset + 10], bone[11] = 0, bone[12] = bones[offset + 3], bone[13] = bones[offset + 7], bone[14] = bones[offset + 11], bone[15] = 1, mat4.transpose(bone)
            }
            mat4.inverse(this._perObjectData.perObjectVSData.Get("worldMatrix"), this._perObjectData.perObjectVSData.Get("invWorldMatrix")), mat4.transpose(this.decalMatrix, this._perObjectData.perObjectVSData.Get("decalMatrix")), mat4.transpose(this.invDecalMatrix, this._perObjectData.perObjectVSData.Get("invDecalMatrix")), this._perObjectData.perObjectPSData = perObjectData.perObjectPSData, batch.perObjectData = this._perObjectData, batch.geometryProvider = this, batch.renderMode = device.RM_DECAL, accumulator.Commit(batch)
        }
    }, EveSpaceObjectDecal.prototype.Render = function (batch, overrideEffect) {
        var bkIB = this.parentGeometry.meshes[0].indexes,
            bkStart = this.parentGeometry.meshes[0].areas[0].start,
            bkCount = this.parentGeometry.meshes[0].areas[0].count;
        mat4.set(this.decalMatrix, variableStore._variables.u_DecalMatrix.value), mat4.set(this.invDecalMatrix, variableStore._variables.u_InvDecalMatrix.value), this.parentGeometry.meshes[0].indexes = this._indexBuffer, this.parentGeometry.meshes[0].areas[0].start = 0, this.parentGeometry.meshes[0].areas[0].count = this.indexBuffer.length, this.parentGeometry.RenderAreas(0, 0, 1, overrideEffect ? overrideEffect : this.decalEffect), this.parentGeometry.meshes[0].indexes = bkIB, this.parentGeometry.meshes[0].areas[0].start = bkStart, this.parentGeometry.meshes[0].areas[0].count = bkCount
    }, EveSpaceScene.prototype.Initialize = function () {
        "" != this.envMapResPath && (this.envMapRes = resMan.GetResource(this.envMapResPath)), "" != this.envMap1ResPath && (this.envMap1Res = resMan.GetResource(this.envMap1ResPath)), "" != this.envMap2ResPath && (this.envMap2Res = resMan.GetResource(this.envMap2ResPath)), "" != this.envMap3ResPath && (this.envMap3Res = resMan.GetResource(this.envMap3ResPath))
    }, EveSpaceScene.prototype.SetEnvMapPath = function (index, path) {
        switch (index) {
            case 0:
                this.envMap1ResPath = path, this.envMap1Res = "" != this.envMap1ResPath ? resMan.GetResource(this.envMap1ResPath) : null;
                break;
            case 1:
                this.envMap2ResPath = path, this.envMap2Res = "" != this.envMap2ResPath ? resMan.GetResource(this.envMap2ResPath) : null;
                break;
            case 2:
                this.envMap3ResPath = path, this.envMap3Res = "" != this.envMap3ResPath ? resMan.GetResource(this.envMap3ResPath) : null
        }
    }, EveSpaceScene.prototype.RenderBatches = function (mode, objectArray) {
        for (var i = 0; i < objectArray.length; ++i) "undefined" != typeof objectArray[i].GetBatches && objectArray[i].GetBatches(mode, this._batches)
    }, EveSpaceScene.prototype.EnableLod = function (enable) {
        if (this.lodEnabled = enable, !enable)
            for (var i = 0; i < this.objects.length; ++i) this.objects[i].ResetLod && this.objects[i].ResetLod()
    }, EveSpaceScene.prototype.ApplyPerFrameData = function () {
        var view = device.view,
            projection = device.projection,
            viewInverseTranspose = mat4.inverse(view, mat4.create());
        this._perFrameVS.Set("ViewInverseTransposeMat", viewInverseTranspose), mat4.transpose(mat4.multiply(projection, view, this._perFrameVS.Get("ViewProjectionMat"))), mat4.transpose(view, this._perFrameVS.Get("ViewMat")), mat4.transpose(projection, this._perFrameVS.Get("ProjectionMat"));
        var envMapTransform = mat4.scale(quat4.toMat4(this.envMapRotation), this.envMapScaling, mat4.create());
        mat4.transpose(envMapTransform), this._perFrameVS.Set("EnvMapRotationMat", envMapTransform), vec3.normalize(vec3.negate(this.sunDirection, this._perFrameVS.Get("SunData.DirWorld"))), this._perFrameVS.Set("SunData.DiffuseColor", this.sunDiffuseColor);
        var fogFactors = this._perFrameVS.Get("FogFactors"),
            distance = this.fogEnd - this.fogStart;
        Math.abs(distance) < 1e-5 && (distance = 1e-5);
        var factor = 1 / distance;
        fogFactors[0] = this.fogEnd * factor, fogFactors[1] = factor, fogFactors[2] = this.fogMax;
        var targetResolution = this._perFrameVS.Get("TargetResolution");
        targetResolution[0] = device.viewportWidth, targetResolution[1] = device.viewportHeight;
        var aspectRatio = projection[0] ? projection[5] / projection[0] : 0,
            aspectAdjustment = 1;
        aspectRatio > 1.6 && (aspectAdjustment = aspectRatio / 1.6);
        var fov = 2 * Math.atan(aspectAdjustment / projection[5]);
        targetResolution[3] = fov, targetResolution[2] = targetResolution[3] * aspectRatio;
        var viewportAdj = this._perFrameVS.Get("ViewportAdjustment");
        viewportAdj[0] = 1, viewportAdj[1] = 1, viewportAdj[2] = 1, viewportAdj[3] = 1, this._perFramePS.Set("ViewInverseTransposeMat", viewInverseTranspose), mat4.transpose(view, this._perFramePS.Get("ViewMat")), this._perFramePS.Set("EnvMapRotationMat", envMapTransform), vec3.normalize(vec3.negate(this.sunDirection, this._perFramePS.Get("SunData.DirWorld"))), this._perFramePS.Set("SunData.DiffuseColor", this.sunDiffuseColor), this._perFramePS.Set("SceneData.AmbientColor", this.ambientColor), this._perFramePS.Get("SceneData.NebulaIntensity")[0] = this.nebulaIntensity, this._perFramePS.Set("SceneData.FogColor", this.fogColor), this._perFramePS.Get("ShadowCameraRange")[0] = 1;
        var targetResolution = this._perFramePS.Get("TargetResolution");
        targetResolution[0] = device.viewportWidth, targetResolution[1] = device.viewportHeight, targetResolution[3] = fov, targetResolution[2] = targetResolution[3] * aspectRatio;
        var shadowMapSettings = this._perFramePS.Get("ShadowMapSettings");
        shadowMapSettings[0] = 1, shadowMapSettings[1] = 1, shadowMapSettings[2] = 0, shadowMapSettings[3] = 0;
        var miscSettings = this._perFramePS.Get("MiscSettings");
        miscSettings[0] = variableStore._variables.Time.value[0], miscSettings[1] = 0, miscSettings[2] = variableStore._variables.ViewportSize.value[0], miscSettings[3] = variableStore._variables.ViewportSize.value[1], miscSettings = this._perFrameVS.Get("MiscSettings"), miscSettings[0] = variableStore._variables.Time.value[0], miscSettings[1] = 0, miscSettings[2] = variableStore._variables.ViewportSize.value[0], miscSettings[3] = variableStore._variables.ViewportSize.value[1], miscSettings = this._perFramePS.Get("MiscSettings2"), miscSettings[0] = 1, miscSettings[1] = this.fogType, miscSettings[2] = this.fogBlur, miscSettings[3] = 1, this._envMapHandle.textureRes = this.envMapRes, this._envMap1Handle.textureRes = this.envMap1Res, this._envMap2Handle.textureRes = this.envMap2Res, this._envMap3Handle.textureRes = this.envMap3Res, device.perFrameVSData = this._perFrameVS, device.perFramePSData = this._perFramePS
    }, EveSpaceScene.prototype.Render = function () {
        if (this.ApplyPerFrameData(), this.backgroundRenderingEnabled && (this.backgroundEffect && (device.SetStandardStates(device.RM_FULLSCREEN), device.RenderCameraSpaceQuad(this.backgroundEffect)), this.planets.length)) {
            var tempProj = mat4.set(device.projection, mat4.create()),
                newProj = mat4.set(device.projection, mat4.create()),
                zn = 1e4,
                zf = 1e11;
            newProj[10] = zf / (zn - zf), newProj[14] = zf * zn / (zn - zf), device.SetProjection(newProj), this.ApplyPerFrameData();
            for (var id = mat4.identity(mat4.create()), i = 0; i < this.planets.length; ++i) this.planets[i].UpdateViewDependentData && this.planets[i].UpdateViewDependentData(id);
            this._batches.Clear(), device.gl.depthRange(.9, 1), this.RenderBatches(device.RM_OPAQUE, this.planets), this.RenderBatches(device.RM_DECAL, this.planets), this.RenderBatches(device.RM_TRANSPARENT, this.planets), this.RenderBatches(device.RM_ADDITIVE, this.planets), this._batches.Render(), device.SetProjection(tempProj), this.ApplyPerFrameData(), device.gl.depthRange(0, .9)
        }
        if (this.lodEnabled) {
            var frustum = new Tw2Frustum;
            frustum.Initialize(device.view, device.projection, device.viewportWidth);
            for (var i = 0; i < this.objects.length; ++i) this.objects[i].UpdateLod && this.objects[i].UpdateLod(frustum)
        }
        for (var id = mat4.identity(mat4.create()), i = 0; i < this.objects.length; ++i) this.objects[i].UpdateViewDependentData && this.objects[i].UpdateViewDependentData(id);
        for (var i = 0; i < this.lensflares.length; ++i) this.lensflares[i].PrepareRender();
        this._batches.Clear(), this.RenderBatches(device.RM_OPAQUE, this.objects), this.RenderBatches(device.RM_DECAL, this.objects), this.RenderBatches(device.RM_TRANSPARENT, this.objects), this.RenderBatches(device.RM_ADDITIVE, this.objects);
        for (var i = 0; i < this.lensflares.length; ++i) this.lensflares[i].GetBatches(device.RM_ADDITIVE, this._batches);
        this._batches.Render();
        for (var i = 0; i < this.lensflares.length; ++i) this.lensflares[i].UpdateOccluders();
        if (this.renderDebugInfo) {
            null == this._debugHelper && (this._debugHelper = new Tw2DebugRenderer);
            for (var i = 0; i < this.objects.length; ++i) "undefined" != typeof this.objects[i].RenderDebugInfo && this.objects[i].RenderDebugInfo(this._debugHelper);
            this._debugHelper.Render()
        }
    }, EveSpaceScene.prototype.Update = function (dt) {
        for (var i = 0; i < this.planets.length; ++i) "undefined" != typeof this.planets[i].Update && this.planets[i].Update(dt);
        for (var i = 0; i < this.objects.length; ++i) "undefined" != typeof this.objects[i].Update && this.objects[i].Update(dt)
    }, EveOccluder.prototype.UpdateValue = function (parentTransform, index) {
        if (this.display && device.alphaBlendBackBuffer) {
            for (var batches = new Tw2BatchAccumulator, i = 0; i < this.sprites.length; ++i) this.sprites[i].UpdateViewDependentData(parentTransform), this.sprites[i].GetBatches(device.RM_DECAL, batches);
            variableStore._variables.OccluderValue.value.set([(1 << 2 * index) / 255, (2 << 2 * index) / 255, 0, 0]), batches.Render();
            var worldViewProj = mat4.multiply(device.projection, device.view, mat4.create());
            worldViewProj = mat4.multiply(worldViewProj, this.sprites[0].worldTransform);
            var center = quat4.create([0, 0, 0, 1]);
            mat4.multiplyVec4(worldViewProj, center);
            var x0 = .5 * (center[0] / center[3] + 1),
                y0 = .5 * (center[1] / center[3] + 1);
            center[0] = center[1] = .5, center[2] = 0, center[3] = 1, mat4.multiplyVec4(worldViewProj, center);
            var x1 = .5 * (center[0] / center[3] + 1),
                y1 = .5 * (center[1] / center[3] + 1);
            center[0] = x0, center[1] = y0, center[2] = x1 - x0, center[3] = y1 - y0, EveOccluder._collectEffect.parameters.OccluderPosition.SetValue(center)
        }
    }, EveOccluder.prototype.CollectSamples = function (tex, index, total, samples) {
        var effect = EveOccluder._collectEffect,
            effectRes = effect.GetEffectRes();
        if (effectRes.IsGood()) {
            effect.parameters.BackBuffer.textureRes = tex, effect.parameters.OccluderIndex.SetValue([index, total, samples]), device.SetStandardStates(device.RM_ADDITIVE), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, EveOccluder._vertexBuffer);
            for (var pass = 0; pass < effect.GetPassCount(); ++pass) {
                if (effect.ApplyPass(pass), !EveOccluder._decl.SetDeclaration(effect.GetPassInput(pass), 16)) return;
                device.ApplyShadowState(), device.gl.drawArrays(device.gl.TRIANGLES, 0, 1530)
            }
        }
    }, EveLensflare.prototype.MatrixArcFromForward = function (out, v) {
        var norm = vec3.normalize(v, norm);
        if (mat4.identity(out), !(norm[2] < -.99999)) {
            if (norm[2] > .99999) return out[5] = -1, void(out[10] = -1);
            var h = (1 + norm[2]) / (norm[0] * norm[0] + norm[1] * norm[1]);
            out[0] = h * norm[1] * norm[1] - norm[2], out[1] = -h * norm[0] * norm[1], out[2] = norm[0], out[4] = out[1], out[5] = h * norm[0] * norm[0] - norm[2], out[6] = norm[1], out[8] = -norm[0], out[9] = -norm[1], out[10] = -norm[2]
        }
    }, EveLensflare.prototype.PrepareRender = function () {
        if (this.display) {
            var cameraPos = mat4.multiplyVec3(device.viewInv, vec3.create());
            if (0 == vec3.length(this.position)) {
                var curPos = vec3.negate(cameraPos, vec3.create()),
                    distScale = vec3.length(curPos);
                distScale = distScale > 1.5 ? 1 / Math.log(distScale) : 2.5, vec3.normalize(curPos, this._direction)
            } else {
                var invPos = vec3.negate(this.position, vec3.create());
                vec3.normalize(invPos, this._direction)
            }
            var viewDir = mat4.multiplyVec4(device.viewInv, quat4.create([0, 0, 1, 0])),
                cameraSpacePos = vec3.create();
            cameraSpacePos[0] = -this.cameraFactor * viewDir[0] + cameraPos[0], cameraSpacePos[1] = -this.cameraFactor * viewDir[1] + cameraPos[1], cameraSpacePos[2] = -this.cameraFactor * viewDir[2] + cameraPos[2];
            var negDirVec = vec3.negate(this._direction, vec3.create());
            this.MatrixArcFromForward(this._transform, negDirVec), this._transform[12] = cameraSpacePos[0], this._transform[13] = cameraSpacePos[1], this._transform[14] = cameraSpacePos[2];
            {
                mat4.scale(mat4.identity(mat4.create()), [this.occlusionIntensity, this.occlusionIntensity, 1])
            }
            this._directionVar.value[0] = this._direction[0], this._directionVar.value[1] = this._direction[1], this._directionVar.value[2] = this._direction[2], this._directionVar.value[3] = 1;
            var d = quat4.create([this._direction[0], this._direction[1], this._direction[2], 0]);
            mat4.multiplyVec4(device.view, d), mat4.multiplyVec4(device.projection, d), d[0] /= d[3], d[1] /= d[3];
            for (var distanceToEdge = 1 - Math.min(1 - Math.abs(d[0]), 1 - Math.abs(d[1])), distanceToCenter = Math.sqrt(d[0] * d[0] + d[1] * d[1]), radialAngle = Math.atan2(d[1], d[0]) + Math.PI, i = 0; i < this.distanceToEdgeCurves.length; ++i) this.distanceToEdgeCurves[i].UpdateValue(distanceToEdge);
            for (i = 0; i < this.distanceToCenterCurves.length; ++i) this.distanceToCenterCurves[i].UpdateValue(distanceToCenter);
            for (i = 0; i < this.radialAngleCurves.length; ++i) this.radialAngleCurves[i].UpdateValue(radialAngle);
            for (i = 0; i < this.xDistanceToCenter.length; ++i) this.xDistanceToCenter[i].UpdateValue(d[0] + 10);
            for (i = 0; i < this.yDistanceToCenter.length; ++i) this.yDistanceToCenter[i].UpdateValue(d[1] + 10);
            for (i = 0; i < this.bindings.length; ++i) this.bindings[i].CopyValue();
            for (i = 0; i < this.flares.length; ++i) this.flares[i].UpdateViewDependentData(this._transform)
        }
    }, EveLensflare.prototype.UpdateOccluders = function () {
        if (this.doOcclusionQueries) {
            if (this.occlusionIntensity = 1, this.backgroundOcclusionIntensity = 1, !EveLensflare.occluderLevels[0].texture || EveLensflare.occluderLevels[0].width < 2 * this.occluders.length)
                for (var i = 0; i < EveLensflare.occluderLevels.length; ++i) EveLensflare.occluderLevels[i].Create(2 * this.occluders.length, 1, !1);
            for (var j = 0; j < this.flares.length; ++j) "_backBuffer" in this.flares[j] && (this.flares[j]._backBuffer.textureRes = EveLensflare.occluderLevels.texture);
            EveLensflare.occluderLevels[EveLensflare.occludedLevelIndex].Set(), device.SetStandardStates(device.RM_OPAQUE), device.gl.clearColor(0, 0, 0, 1), device.gl.clear(device.gl.COLOR_BUFFER_BIT), EveLensflare.occluderLevels[EveLensflare.occludedLevelIndex].Unset();
            var samples = 1;
            device.antialiasing && (samples = device.msaaSamples, device.gl.sampleCoverage(1 / samples, !1));
            for (var i = 0; i < this.occluders.length; ++i) device.SetRenderState(device.RS_COLORWRITEENABLE, 8), device.gl.colorMask(!1, !1, !1, !0), device.gl.clearColor(0, 0, 0, 0), device.gl.clear(device.gl.COLOR_BUFFER_BIT), device.antialiasing && (device.gl.enable(device.gl.SAMPLE_COVERAGE), device.gl.sampleCoverage(.25, !1)), this.occluders[i].UpdateValue(this._transform, i), device.antialiasing && device.gl.disable(device.gl.SAMPLE_COVERAGE), EveLensflare.backBuffer.texture || EveLensflare.backBuffer.Attach(device.gl.createTexture()), device.gl.bindTexture(device.gl.TEXTURE_2D, EveLensflare.backBuffer.texture), (EveLensflare.backBuffer.width != device.viewportWidth || EveLensflare.backBuffer.height != device.viewportHeight) && (device.gl.texImage2D(device.gl.TEXTURE_2D, 0, device.gl.RGBA, device.viewportWidth, device.viewportHeight, 0, device.gl.RGBA, device.gl.UNSIGNED_BYTE, null), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_MAG_FILTER, device.gl.LINEAR), device.gl.texParameteri(device.gl.TEXTURE_2D, device.gl.TEXTURE_MIN_FILTER, device.gl.LINEAR), EveLensflare.backBuffer.width = device.viewportWidth, EveLensflare.backBuffer.height = device.viewportHeight), device.gl.copyTexImage2D(device.gl.TEXTURE_2D, 0, device.alphaBlendBackBuffer ? device.gl.RGBA : device.gl.RGB, 0, 0, EveLensflare.backBuffer.width, EveLensflare.backBuffer.height, 0), device.gl.bindTexture(device.gl.TEXTURE_2D, null), EveLensflare.occluderLevels[EveLensflare.occludedLevelIndex].Set(), this.occluders[i].CollectSamples(EveLensflare.backBuffer, i, EveLensflare.occluderLevels[0].width / 2, samples), EveLensflare.occluderLevels[EveLensflare.occludedLevelIndex].Unset();
            device.antialiasing && device.gl.sampleCoverage(1, !1), EveLensflare.occluderLevels[(EveLensflare.occludedLevelIndex + 1) % EveLensflare.occluderLevels.length].Set();
            var pixels = new Uint8Array(4 * EveLensflare.occluderLevels[0].width);
            for (device.gl.readPixels(0, 0, 2, 1, device.gl.RGBA, device.gl.UNSIGNED_BYTE, pixels), EveLensflare.occluderLevels[(EveLensflare.occludedLevelIndex + 1) % EveLensflare.occluderLevels.length].Unset(), this.occlusionIntensity = 1, i = 0; i < 2 * EveLensflare.occluderLevels[0].width; i += 4) this.occlusionIntensity *= pixels[i + 1] ? pixels[i] / pixels[i + 1] : 1;
            this.backgroundOcclusionIntensity = this.occlusionIntensity, this._occlusionVar.value[0] = this.occlusionIntensity, this._occlusionVar.value[1] = this._occlusionVar.value[0], EveLensflare.occludedLevelIndex = (EveLensflare.occludedLevelIndex + 1) % EveLensflare.occluderLevels.length
        }
    }, EveLensflare.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (this.display) {
            var viewDir = mat4.multiplyVec4(device.viewInv, quat4.create([0, 0, 1, 0]));
            if (!(vec3.dot(viewDir, this._direction) < 0)) {
                for (var i = 0; i < this.flares.length; ++i) this.flares[i].GetBatches(mode, accumulator, perObjectData);
                this.mesh && this.mesh.GetBatches(mode, accumulator, perObjectData)
            }
        }
    }, EvePlanet.prototype.Create = function (itemID, planetPath, atmospherePath, heightMap1, heightMap2) {
        this.itemID = itemID, this.heightMapResPath1 = heightMap1, this.heightMapResPath2 = heightMap2, this.highDetail.children = [];
        var self = this;
        resMan.GetObject(planetPath, function (obj) {
            self.highDetail.children.unshift(obj), self._MeshLoaded()
        }), atmospherePath && resMan.GetObject(atmospherePath, function (obj) {
            self.highDetail.children.push(obj)
        }), this.hightDirty = !0
    }, EvePlanet.prototype.GetResources = function (obj, visited, result) {
        if (-1 == visited.indexOf(obj)) {
            if (visited.push(obj), obj && "undefined" != typeof obj.doNotPurge) return void result.push(obj);
            for (var prop in obj) "object" == typeof obj[prop] && this.GetResources(obj[prop], visited, result)
        }
    }, EvePlanet.prototype._MeshLoaded = function () {
        this.lockedResources = [], this.GetResources(this.highDetail, [], this.lockedResources);
        var mainMesh = this.highDetail.children[0].mesh,
            originalEffect = null;
        if (mainMesh.transparentAreas.length) {
            originalEffect = mainMesh.transparentAreas[0].effect;
            var resPath = originalEffect.effectFilePath
        } else if (mainMesh.opaqueAreas.length) {
            originalEffect = mainMesh.opaqueAreas[0].effect;
            var resPath = originalEffect.effectFilePath
        } else var resPath = "res:/Graphics/Effect/Managed/Space/Planet/EarthlikePlanet.fx";
        resPath = resPath.replace(".fx", "BlitHeight.fx");
        for (var param in originalEffect.parameters) this.effectHeight.parameters[param] = originalEffect.parameters[param];
        for (var i = 0; i < this.highDetail.children[0].children.length; ++i)
            if (mainMesh = this.highDetail.children[0].children[i].mesh) {
                if (originalEffect = null, mainMesh.transparentAreas.length) originalEffect = mainMesh.transparentAreas[0].effect;
                else {
                    if (!mainMesh.opaqueAreas.length) continue;
                    originalEffect = mainMesh.opaqueAreas[0].effect
                }
                for (var param in originalEffect.parameters) this.effectHeight.parameters[param] = originalEffect.parameters[param]
            }
        var param = new Tw2TextureParameter;
        param.name = "NormalHeight1", param.resourcePath = this.heightMapResPath1, param.Initialize(), this.lockedResources.push(param.textureRes), this.effectHeight.parameters[param.name] = param, param = new Tw2TextureParameter, param.name = "NormalHeight2", param.resourcePath = this.heightMapResPath2, param.Initialize(), this.lockedResources.push(param.textureRes), this.effectHeight.parameters[param.name] = param, param = new Tw2FloatParameter, param.name = "Random", param.value = this.itemID % 100, this.effectHeight.parameters[param.name] = param, param = new Tw2FloatParameter, param.name = "TargetTextureHeight", param.value = 1024, this.effectHeight.parameters[param.name] = param, this.effectHeight.effectFilePath = resPath, this.effectHeight.Initialize(), this.hightDirty = !0, this.heightMap.Create(2048, 1024, !1);
        for (var i = 0; i < this.lockedResources.length; ++i) this.lockedResources[i].doNotPurge++, this.lockedResources[i].IsPurged() && this.lockedResources[i].Reload()
    }, EvePlanet.prototype.GetBatches = function (mode, accumulator) {
        if (this.hightDirty && !resMan.IsLoading() && "" != this.heightMapResPath1) {
            this.heightMap.Set(), device.SetStandardStates(device.RM_FULLSCREEN), device.gl.clearColor(0, 0, 0, 0), device.gl.clear(device.gl.COLOR_BUFFER_BIT), device.RenderFullScreenQuad(this.effectHeight), this.heightMap.Unset(), this.hightDirty = !1;
            for (var i = 0; i < this.lockedResources.length; ++i) this.lockedResources[i].doNotPurge--;
            var mainMesh = this.highDetail.children[0].mesh,
                originalEffect = null;
            mainMesh.transparentAreas.length ? originalEffect = mainMesh.transparentAreas[0].effect : mainMesh.opaqueAreas.length && (originalEffect = mainMesh.opaqueAreas[0].effect), originalEffect && (originalEffect.parameters.HeightMap.textureRes = this.heightMap.texture)
        }
        this.highDetail.GetBatches(mode, accumulator)
    }, EvePlanet.prototype.Update = function (dt) {
        this.highDetail.Update(dt)
    }, EvePlanet.prototype.UpdateViewDependentData = function (parentTransform) {
        this.highDetail.UpdateViewDependentData(parentTransform)
    }, EveEffectRoot.prototype.Update = function (dt) {
        this.highDetail && this.highDetail.Update(dt), mat4.identity(this.localTransform), mat4.translate(this.localTransform, this.translation), mat4.transpose(quat4.toMat4(quat4.normalize(this.rotation), this.rotationTransform)), mat4.multiply(this.localTransform, this.rotationTransform, this.localTransform), mat4.scale(this.localTransform, this.scaling)
    }, EveEffectRoot.prototype.GetBatches = function (mode, accumulator) {
        this.display && this.isPlaying && this.highDetail && (this.highDetail.UpdateViewDependentData(this.localTransform), mat4.transpose(this.localTransform, this._perObjectData.perObjectVSData.Get("WorldMat")), this.highDetail.GetBatches(mode, accumulator, this._perObjectData))
    }, EveEffectRoot.prototype.Start = function () {
        if (this.highDetail) {
            this.isPlaying = !0;
            for (var i = 0; i < this.highDetail.curveSets.length; ++i) this.highDetail.curveSets[i].Play()
        }
    }, EveEffectRoot.prototype.Stop = function () {
        this.isPlaying = !1
    }, EveStretch._tempVec3 = [vec3.create(), vec3.create(), vec3.create()], EveStretch._tempMat4 = [mat4.create(), mat4.create()], EveStretch.prototype.Update = function (dt) {
        for (var i = 0; i < this.curveSets.length; ++i) this.curveSets[i].Update(dt);
        this._time += dt, this.source ? this.source.GetValueAt(t, this._sourcePosition) : this._useTransformsForStretch && (this._sourcePosition[0] = this._sourceTransform[12], this._sourcePosition[1] = this._sourceTransform[13], this._sourcePosition[2] = this._sourceTransform[14]), this.dest && this.source.GetValueAt(t, this._destinationPosition);
        var directionVec = vec3.subtract(this._destinationPosition, this._sourcePosition, EveStretch._tempVec3[0]),
            scalingLength = vec3.length(directionVec);
        this.length.value = scalingLength, vec3.normalize(directionVec), this.sourceObject && this._displaySourceObject && this.sourceObject.Update(dt), this.stretchObject && this.stretchObject.Update(dt), this.destObject && this._displayDestObject && this.destObject.Update(dt)
    }, EveStretch.prototype.UpdateViewDependentData = function () {
        if (this.display) {
            var directionVec = vec3.subtract(this._destinationPosition, this._sourcePosition, EveStretch._tempVec3[0]),
                scalingLength = vec3.length(directionVec);
            vec3.normalize(directionVec);
            var m = EveStretch._tempMat4[0];
            if (this._useTransformsForStretch) mat4.identity(m), mat4.rotateX(m, -Math.PI / 2), mat4.multiply(this._sourceTransform, m, m);
            else {
                mat4.identity(m);
                var up = EveStretch._tempVec3[2];
                Math.abs(directionVec[1]) > .9 ? up[2] = 1 : up[1] = 1;
                var x = vec3.normalize(vec3.cross(up, directionVec, EveStretch._tempVec3[1]));
                vec3.cross(directionVec, x, up), m[0] = x[0], m[1] = x[1], m[2] = x[2], m[4] = -directionVec[0], m[5] = -directionVec[1], m[6] = -directionVec[2], m[8] = up[0], m[9] = up[1], m[10] = up[2]
            }
            if (this.destObject && this._displayDestObject && (m[12] = this._destinationPosition[0], m[13] = this._destinationPosition[1], m[14] = this._destinationPosition[2], this.destObject.UpdateViewDependentData(m)), this.sourceObject && this._displaySourceObject && (this._useTransformsForStretch ? (mat4.identity(m), mat4.rotateX(m, -Math.PI / 2), mat4.multiply(this._sourceTransform, m, m)) : (m[12] = this._sourcePosition[0], m[13] = this._sourcePosition[1], m[14] = this._sourcePosition[2]), this.sourceObject.UpdateViewDependentData(m)), this.stretchObject) {
                if (this._useTransformsForStretch) mat4.identity(m), mat4.scale(m, [1, 1, scalingLength]), mat4.multiply(this._sourceTransform, m, m);
                else {
                    m[0] = x[0], m[1] = x[1], m[2] = x[2], m[4] = up[0], m[5] = up[1], m[6] = up[2], m[8] = -directionVec[0], m[9] = -directionVec[1], m[10] = -directionVec[2], this._isNegZForward && (scalingLength = -scalingLength);
                    var s = mat4.scale(mat4.identity(EveStretch._tempMat4[1]), [1, 1, scalingLength]);
                    mat4.multiply(m, s, m)
                }
                this.stretchObject.UpdateViewDependentData(m)
            }
        }
    }, EveStretch.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        this.display && (this.sourceObject && this._displaySourceObject && this.sourceObject.GetBatches(mode, accumulator, perObjectData), this.destObject && this._displayDestObject && this.destObject.GetBatches(mode, accumulator, perObjectData), this.stretchObject && this.stretchObject.GetBatches(mode, accumulator, perObjectData))
    }, EveStretch.prototype.SetSourcePosition = function (position) {
        this._useTransformsForStretch = !1, this._sourcePosition = position
    }, EveStretch.prototype.SetDestinationPosition = function (position) {
        this._destinationPosition = position
    }, EveStretch.prototype.SetSourceTransform = function (transform) {
        this._useTransformsForStretch = !0, this._sourceTransform = transform
    }, EveStretch.prototype.SetIsNegZForward = function (isNegZForward) {
        this._isNegZForward = isNegZForward
    }, EveTurretFiringFX.prototype.Initialize = function () {
        this._firingDuration = this.GetCurveDuration();
        for (var i = 0; i < this.stretch.length; ++i) this._perMuzzleData[i] = new EvePerMuzzleData;
        this._perMuzzleData.length > 0 && (this._perMuzzleData[0].constantDelay = this.firingDelay1), this._perMuzzleData.length > 1 && (this._perMuzzleData[1].constantDelay = this.firingDelay2), this._perMuzzleData.length > 2 && (this._perMuzzleData[2].constantDelay = this.firingDelay3), this._perMuzzleData.length > 3 && (this._perMuzzleData[3].constantDelay = this.firingDelay4), this._perMuzzleData.length > 4 && (this._perMuzzleData[4].constantDelay = this.firingDelay5), this._perMuzzleData.length > 5 && (this._perMuzzleData[5].constantDelay = this.firingDelay6), this._perMuzzleData.length > 6 && (this._perMuzzleData[6].constantDelay = this.firingDelay7), this._perMuzzleData.length > 7 && (this._perMuzzleData[7].constantDelay = this.firingDelay8)
    }, EveTurretFiringFX.prototype.GetCurveDuration = function () {
        for (var maxDuration = 0, i = 0; i < this.stretch.length; ++i)
            for (var stretch = this.stretch[i], j = 0; j < stretch.curveSets.length; ++j) maxDuration = Math.max(maxDuration, stretch.curveSets[j].GetMaxCurveDuration());
        return maxDuration
    }, EveTurretFiringFX.prototype.GetPerMuzzleEffectCount = function () {
        return this.stretch.length
    }, EveTurretFiringFX.prototype.SetMuzzleBoneID = function (index, bone) {
        this._perMuzzleData[index].muzzlePositionBone = bone
    }, EveTurretFiringFX.prototype.GetBatches = function (mode, accumulator, perObjectData) {
        if (this.display && this.isFiring)
            for (var i = 0; i < this.stretch.length; ++i) this._perMuzzleData[i].started && (this._firingDuration >= this._perMuzzleData[i].elapsedTime || this.isLoopFiring) && this.stretch[i].GetBatches(mode, accumulator, perObjectData)
    }, EveTurretFiringFX.prototype.GetMuzzleTransform = function (index) {
        return this._perMuzzleData[index].muzzleTransform
    }, EveTurretFiringFX.prototype.Update = function (dt) {
        for (var retVal = !1, i = 0; i < this.stretch.length; ++i) this._perMuzzleData[i].started && (this._perMuzzleData[i].elapsedTime += dt), (this._perMuzzleData[i].elapsedTime < this._firingDuration || this.isLoopFiring) && this.isFiring && (this._perMuzzleData[i].started ? (this.useMuzzleTransform ? this.stretch[i].SetSourceTransform(this._perMuzzleData[i].muzzleTransform) : this.stretch[i].SetSourcePosition(this._perMuzzleData[i].muzzlePosition), this.stretch[i].SetDestinationPosition(this.endPosition), this.stretch[i].SetIsNegZForward(!0)) : (this._perMuzzleData[i].readyToStart ? (this.StartMuzzleEffect(i), this._perMuzzleData[i].currentStartDelay = 0, this._perMuzzleData[i].elapsedTime = 0, retVal = !0) : this._perMuzzleData[i].currentStartDelay -= dt, this._perMuzzleData[i].currentStartDelay <= 0 && (this._perMuzzleData[i].readyToStart = !0))), this.stretch[i].Update(dt)
    }, EveTurretFiringFX.prototype.PrepareFiring = function (delay, muzzleID) {
        "undefined" == typeof muzzleID && (muzzleID = -1);
        for (var i = 0; i < this.stretch.length; ++i) 0 > muzzleID || muzzleID == i ? (this._perMuzzleData[i].currentStartDelay = delay + this._perMuzzleData[i].constantDelay, this._perMuzzleData[i].started = !1, this._perMuzzleData[i].readyToStart = !1, this._perMuzzleData[i].elapsedTime = 0) : (this._perMuzzleData[i].currentStartDelay = Number.MAX_VALUE, this._perMuzzleData[i].started = !1, this._perMuzzleData[i].readyToStart = !1, this._perMuzzleData[i].elapsedTime = 0);
        this.isFiring = !0
    }, EveTurretFiringFX.prototype.StartMuzzleEffect = function (muzzleID) {
        for (var stretch = this.stretch[muzzleID], i = 0; i < stretch.curveSets.length; ++i) {
            var curveSet = stretch.curveSets[i];
            "play_start" == curveSet.name ? curveSet.PlayFrom(-this._perMuzzleData[muzzleID].currentStartDelay) : "play_loop" == curveSet.name ? curveSet.PlayFrom(-this._perMuzzleData[muzzleID].currentStartDelay) : "play_stop" == curveSet.name && curveSet.Stop()
        }
        this._perMuzzleData[muzzleID].started = !0, this._perMuzzleData[muzzleID].readyToStart = !1
    }, EveTurretFiringFX.prototype.StopFiring = function () {
        for (var j = 0; j < this.stretch.length; ++j) {
            for (var stretch = this.stretch[j], i = 0; i < stretch.curveSets.length; ++i) {
                var curveSet = stretch.curveSets[i];
                "play_start" == curveSet.name ? curveSet.Stop() : "play_loop" == curveSet.name ? curveSet.Stop() : "play_stop" == curveSet.name && curveSet.Play()
            }
            this._perMuzzleData[j].started = !1, this._perMuzzleData[j].readyToStart = !1, this._perMuzzleData[j].currentStartDelay = 0, this._perMuzzleData[j].elapsedTime = 0
        }
        this.isFiring = !1
    }, EveTurretFiringFX.prototype.UpdateViewDependentData = function () {
        for (var j = 0; j < this.stretch.length; ++j) this.stretch[j].UpdateViewDependentData()
    }, Tw2ParticleElementDeclaration.LIFETIME = 0, Tw2ParticleElementDeclaration.POSITION = 1, Tw2ParticleElementDeclaration.VELOCITY = 2, Tw2ParticleElementDeclaration.MASS = 3, Tw2ParticleElementDeclaration.CUSTOM = 4, Tw2ParticleElementDeclaration.prototype.GetDimension = function () {
        switch (this.elementType) {
            case Tw2ParticleElementDeclaration.LIFETIME:
                return 2;
            case Tw2ParticleElementDeclaration.POSITION:
                return 3;
            case Tw2ParticleElementDeclaration.VELOCITY:
                return 3;
            case Tw2ParticleElementDeclaration.MASS:
                return 1
        }
        return this.dimension
    }, Tw2ParticleElementDeclaration.prototype.GetDeclaration = function () {
        var usage = Tw2VertexDeclaration.DECL_TEXCOORD,
            usageIndex = 8;
        switch (this.elementType) {
            case Tw2ParticleElementDeclaration.LIFETIME:
                usage = Tw2VertexDeclaration.DECL_TANGENT;
                break;
            case Tw2ParticleElementDeclaration.POSITION:
                usage = Tw2VertexDeclaration.DECL_POSITION;
                break;
            case Tw2ParticleElementDeclaration.VELOCITY:
                usage = Tw2VertexDeclaration.DECL_NORMAL;
                break;
            case Tw2ParticleElementDeclaration.MASS:
                usage = Tw2VertexDeclaration.DECL_BINORMAL;
                break;
            default:
                usageIndex = this.usageIndex + 8
        }
        return new Tw2VertexElement(usage, usageIndex, device.gl.FLOAT, this.GetDimension())
    }, Tw2ParticleSystem.prototype.Initialize = function () {
        this.UpdateElementDeclaration()
    }, Tw2ParticleSystem.prototype.UpdateElementDeclaration = function () {
        if (this.isValid = !1, this._vb && (device.gl.deleteBuffer(this._vb), this._vb = null), this._declaration = null, this.aliveCount = 0, 0 != this.elements.length) {
            this._stdElements = [null, null, null, null], this._elements = [], this.instanceStride = [0, 0], this.vertexStride = [0, 0], this._declaration = new Tw2VertexDeclaration, this.buffers = [null, null];
            for (var i = 0; i < this.elements.length; ++i) {
                var bufferIndex = this.elements[i].usedByGPU ? 0 : 1,
                    el = new Tr2ParticleElement(this.elements[i]);
                if (el.startOffset = this.vertexStride[bufferIndex], el.offset = el.startOffset, this.elements[i].elementType != Tw2ParticleElementDeclaration.CUSTOM && (this._stdElements[this.elements[i].elementType] = el), this.vertexStride[bufferIndex] += el.dimension, this._elements.push(el), 0 == bufferIndex) {
                    var d = this.elements[i].GetDeclaration();
                    d.offset = 4 * el.startOffset, this._declaration.elements.push(d)
                }
            }
            this._declaration.RebuildHash();
            for (var i = 0; i < this._elements.length; ++i) {
                var bufferIndex = this._elements[i].usedByGPU ? 0 : 1;
                this._elements[i].vertexStride = this.vertexStride[bufferIndex]
            }
            this.instanceStride[0] = 4 * this.vertexStride[0], this.instanceStride[1] = 4 * this.vertexStride[1];
            for (var i = 0; i < this._elements.length; ++i) {
                var bufferIndex = this._elements[i].usedByGPU ? 0 : 1;
                this._elements[i].instanceStride = this.instanceStride[bufferIndex]
            }
            if (this.buffers = [null, null], this.instanceStride[0] && this.maxParticleCount) {
                this.buffers[0] = new Float32Array(this.instanceStride[0] * this.maxParticleCount), this._vb = device.gl.createBuffer(), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, this._vb), device.gl.bufferData(device.gl.ARRAY_BUFFER, 4 * this.buffers[0].length, device.gl.DYNAMIC_DRAW), device.gl.bindBuffer(device.gl.ARRAY_BUFFER, null), this._ib = device.gl.createBuffer();
                for (var ib = new Uint16Array(6 * this.maxParticleCount), i = 0; i < this.maxParticleCount; ++i) ib[6 * i] = 4 * i, ib[6 * i + 1] = 4 * i + 1, ib[6 * i + 2] = 4 * i + 2, ib[6 * i + 3] = 4 * i + 2, ib[6 * i + 4] = 4 * i + 1, ib[6 * i + 5] = 4 * i + 3;
                device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, this._ib), device.gl.bufferData(device.gl.ELEMENT_ARRAY_BUFFER, ib, device.gl.STATIC_DRAW), device.gl.bindBuffer(device.gl.ELEMENT_ARRAY_BUFFER, null)
            }
            this.instanceStride[1] && (this.buffers[1] = new Float32Array(this.instanceStride[1] * this.maxParticleCount));
            for (var i = 0; i < this._elements.length; ++i) {
                var bufferIndex = this._elements[i].usedByGPU ? 0 : 1;
                this._elements[i].buffer = this.buffers[bufferIndex]
            }
            this.requiresSorting && (this._sortedIndexes = new Array(this.maxParticleCount), this._sortedBuffer = new Float32Array(this.instanceStride[0] * this.maxParticleCount), this._distancesBuffer = new Float32Array(this.maxParticleCount)), this.isValid = !0, this.bufferDirty = !0
        }
    }, Tw2ParticleSystem.prototype.HasElement = function (type) {
        return null != this._stdElements[type]
    }, Tw2ParticleSystem.prototype.GetElement = function (type) {
        return this._stdElements[type] && (this._stdElements[type].offset = this._stdElements[type].startOffset), this._stdElements[type]
    }, Tw2ParticleSystem.prototype.BeginSpawnParticle = function () {
        return !this.isValid || this.aliveCount >= this.maxParticleCount ? null : this.aliveCount++
    }, Tw2ParticleSystem.prototype.EndSpawnParticle = function () {
        for (var index = this.aliveCount - 1, j = 0; 2 > j; ++j)
            if (this.buffers[j])
                for (var original = this.buffers[j].subarray(this.instanceStride[j] * index, this.instanceStride[j] * index + this.vertexStride[j]), i = 1; 4 > i; ++i) this.buffers[j].set(original, this.instanceStride[j] * index + i * this.vertexStride[j]);
        this.bufferDirty = !0
    }, Tw2ParticleSystem.prototype.Update = function (dt) {
        if (dt = Math.min(dt, .1), this.applyAging && this.HasElement(Tw2ParticleElementDeclaration.LIFETIME)) {
            for (var lifetime = this.GetElement(Tw2ParticleElementDeclaration.LIFETIME), position = this.emitParticleOnDeathEmitter ? this.GetElement(Tw2ParticleElementDeclaration.POSITION) : null, velocity = this.emitParticleOnDeathEmitter ? this.GetElement(Tw2ParticleElementDeclaration.VELOCITY) : null, i = 0; i < this.aliveCount; ++i)
                if (lifetime.buffer[lifetime.offset] += dt / lifetime.buffer[lifetime.offset + 1], lifetime.buffer[lifetime.offset] > 1) {
                    if (this.emitParticleOnDeathEmitter && this.emitParticleOnDeathEmitter.SpawnParticles(position, velocity, 1), this.aliveCount--, i < this.aliveCount) {
                        for (var j = 0; 2 > j; ++j) this.buffers[j] && this.buffers[j].set(this.buffers[j].subarray(this.instanceStride[j] * this.aliveCount, this.instanceStride[j] * this.aliveCount + this.instanceStride[j]), i * this.instanceStride[j]);
                        --i, this.bufferDirty = !0
                    }
                } else lifetime.offset += lifetime.instanceStride, position && (position.offset += position.instanceStride), velocity && (velocity.offset += velocity.instanceStride);
            lifetime.dirty = !0
        }
        var tmpVec3 = vec3.create();
        if (this.updateSimulation && this.HasElement(Tw2ParticleElementDeclaration.POSITION) && this.HasElement(Tw2ParticleElementDeclaration.VELOCITY)) {
            for (var hasForces = this.applyForce && this.forces.length, i = 0; i < this.forces.length; ++i) this.forces[i].Update(dt);
            for (var position = this.GetElement(Tw2ParticleElementDeclaration.POSITION), velocity = this.GetElement(Tw2ParticleElementDeclaration.VELOCITY), mass = hasForces ? this.GetElement(Tw2ParticleElementDeclaration.MASS) : null, i = 0; i < this.aliveCount; ++i) {
                if (hasForces) {
                    var amass = 1;
                    mass && (amass = mass.buffer[mass.offset]);
                    var force = tmpVec3;
                    force[0] = force[1] = force[2] = 0;
                    for (var j = 0; j < this.forces.length; ++j) this.forces[j].ApplyForce(position, velocity, force, dt, amass);
                    mass && vec3.scale(force, 1 / mass.buffer[mass.offset]), velocity.buffer[velocity.offset] += force[0] * dt, velocity.buffer[velocity.offset + 1] += force[1] * dt, velocity.buffer[velocity.offset + 2] += force[2] * dt
                }
                position.buffer[position.offset] += velocity.buffer[velocity.offset] * dt, position.buffer[position.offset + 1] += velocity.buffer[velocity.offset + 1] * dt, position.buffer[position.offset + 2] += velocity.buffer[velocity.offset + 2] * dt, this.emitParticleDuringLifeEmitter && this.emitParticleDuringLifeEmitter.SpawnParticles(position, velocity, dt), position.offset += position.instanceStride, velocity.offset += velocity.instanceStride, mass && (mass.offset += mass.instanceStride)
            }
            position.dirty = !0, velocity.dirty = !0
        }
        if (this.updateSimulation && this.constraints.length)
            for (var i = 0; i < this.constraints.length; ++i) this.constraints[i].ApplyConstraint(this.buffers, this.instanceStride, this.aliveCount, dt);
        if (this.updateBoundingBox && this.GetBoundingBox(this.aabbMin, this.aabbMax), this.emitParticleDuringLifeEmitter && (!this.HasElement(Tw2ParticleElementDeclaration.POSITION) || !this.HasElement(Tw2ParticleElementDeclaration.VELOCITY)) && this.updateSimulation)
            for (var position = this.GetElement(Tw2ParticleElementDeclaration.POSITION), velocity = this.GetElement(Tw2ParticleElementDeclaration.VELOCITY), i = 0; i < this.aliveCount; ++i) this.emitParticleDuringLifeEmitter.SpawnParticles(position, velocity, 1), position && (position.offset += position.instanceStride), velocity && (velocity.offset += velocity.instanceStride);
        for (var i = 0; i < this._elements.length; ++i) {
            var el = this._elements[i];
            if (el.offset = el.startOffset, el.dirty) {
                this.bufferDirty = !0;
                for (var j = 0; j < this.aliveCount; ++j) {
                    for (var k = 1; 4 > k; ++k)
                        for (var m = 0; m < el.dimension; ++m) el.buffer[el.offset + k * el.vertexStride + m] = el.buffer[el.offset + m];
                    el.offset += el.instanceStride
                }
                el.dirty = !1
            }
        }
    }, Tw2ParticleSystem.prototype.GetBoundingBox = function (aabbMin, aabbMax) {
        if (this.aliveCount && this.HasElement(Tw2ParticleElementDeclaration.POSITION)) {
            var position = this.GetElement(Tw2ParticleElementDeclaration.POSITION);
            aabbMin[0] = position.buffer[position.offset], aabbMin[1] = position.buffer[position.offset + 1], aabbMin[2] = position.buffer[position.offset + 2], aabbMax[0] = position.buffer[position.offset], aabbMax[1] = position.buffer[position.offset + 1], aabbMax[2] = position.buffer[position.offset + 2];
            for (var i = 0; i < this.aliveCount; ++i) aabbMin[0] = Math.min(aabbMin[0], position.buffer[position.offset]), aabbMin[1] = Math.min(aabbMin[1], position.buffer[position.offset + 1]), aabbMin[2] = Math.min(aabbMin[2], position.buffer[position.offset + 2]), aabbMax[0] = Math.max(aabbMax[0], position.buffer[position.offset]), aabbMax[1] = Math.max(aabbMax[1], position.buffer[position.offset + 1]), aabbMax[2] = Math.max(aabbMax[2], position.buffer[position.offset + 2]), position.offset += position.instanceStride;
            return !0
        }
        return !1
    }, Tw2ParticleSystem.prototype._Sort = function () {
        for (var eye = device.viewInv, position = this.GetElement(Tw2ParticleElementDeclaration.POSITION), count = this.aliveCount, distances = this._distancesBuffer, i = 0; count > i; ++i) {
            var o0 = position.offset + position.instanceStride * i,
                dd = position.buffer[o0] - eye[12],
                l0 = dd * dd;
            dd = position.buffer[o0 + 1] - eye[13], l0 += dd * dd, dd = position.buffer[o0 + 2] - eye[14], l0 += dd * dd, distances[i] = l0
        }
        var sortItems = function (a, b) {
            if (a >= count && b >= count) return b > a ? -1 : a > b ? 1 : 0;
            if (a >= count) return 1;
            if (b >= count) return -1;
            var l0 = distances[a],
                l1 = distances[b];
            return l1 > l0 ? 1 : l0 > l1 ? -1 : 0
        };
        for (i = 0; i < this.maxParticleCount; ++i) this._sortedIndexes[i] = i;
        this._sortedIndexes.sort(sortItems)
    }, Tw2ParticleSystem.prototype.Render = function (effect, instanceVB, instanceIB, instanceDecl, instanceStride) {
        if (0 == this.aliveCount) return !1;
        var effectRes = effect.GetEffectRes();
        if (!effectRes._isGood) return !1;
        var d = device;
        if (this.requiresSorting && this.HasElement(Tw2ParticleElementDeclaration.POSITION) && this.buffers) {
            this._Sort();
            for (var toOffset, fromOffset, j, stride = this.instanceStride[0], gpuBuffer = this.buffers[0], i = 0; i < this.aliveCount; ++i)
                for (toOffset = i * stride, fromOffset = this._sortedIndexes[i] * stride, j = 0; stride > j; ++j) this._sortedBuffer[toOffset + j] = gpuBuffer[j + fromOffset];
            d.gl.bindBuffer(d.gl.ARRAY_BUFFER, this._vb), d.gl.bufferSubData(d.gl.ARRAY_BUFFER, 0, this._sortedBuffer.subarray(0, this.instanceStride[0] * this.aliveCount)), this.bufferDirty = !1
        } else this.bufferDirty && (d.gl.bindBuffer(d.gl.ARRAY_BUFFER, this._vb), d.gl.bufferSubData(d.gl.ARRAY_BUFFER, 0, this.buffers[0].subarray(0, this.instanceStride[0] * this.aliveCount)), this.bufferDirty = !1);
        d.gl.bindBuffer(d.gl.ELEMENT_ARRAY_BUFFER, this._ib);
        for (var passCount = effect.GetPassCount(), pass = 0; passCount > pass; ++pass) {
            effect.ApplyPass(pass);
            var passInput = effect.GetPassInput(pass);
            d.gl.bindBuffer(d.gl.ARRAY_BUFFER, this._vb), this._declaration.SetPartialDeclaration(passInput, 4 * this.vertexStride[0]), d.gl.bindBuffer(d.gl.ARRAY_BUFFER, instanceVB), instanceDecl.SetPartialDeclaration(passInput, instanceStride), d.ApplyShadowState(), d.gl.drawElements(d.gl.TRIANGLES, 6 * this.aliveCount, d.gl.UNSIGNED_SHORT, 0)
        }
        return !0
    }, Tw2ParticleSystem.prototype.GetMaxInstanceCount = function () {
        return this.maxParticleCount
    }, Inherit(Tw2InstancedMesh, Tw2Mesh), Tw2InstancedMesh.prototype.Initialize = function () {
        this._super.Initialize.call(this), "" != this.instanceGeometryResPath ? (this.instanceGeometryResource = resMan.GetResource(this.instanceGeometryResPath), this.instanceGeometryResource.RegisterNotification(this)) : this.instanceGeometryResource && this.geometryResource && this.geometryResource.SetInstanceCount(this.instanceGeometryResource.GetMaxInstanceCount(this.instanceMeshIndex))
    }, Tw2InstancedMesh.prototype.RebuildCachedData = function () {
        this.instanceGeometryResource && this.geometryResource && this.geometryResource.SetInstanceCount(this.instanceGeometryResource.GetMaxInstanceCount(this.instanceMeshIndex))
    }, Tw2InstancedMesh.prototype._GetAreaBatches = function (areas, mode, accumulator, perObjectData) {
        for (var i = 0; i < areas.length; ++i) {
            var area = areas[i];
            if (null != area.effect && !area.debugIsHidden) {
                var batch = new Tw2InstancedMeshBatch;
                batch.renderMode = mode, batch.perObjectData = perObjectData, batch.instanceMesh = this, batch.meshIx = area.meshIndex, batch.start = area.index, batch.count = area.count, batch.effect = area.effect, accumulator.Commit(batch)
            }
        }
    }, Tw2InstancedMesh.prototype.RenderAreas = function (effect) {
        if (this.geometryResource && this.geometryResource.KeepAlive(), this.instanceGeometryResource && this.instanceGeometryResource.KeepAlive && this.instanceGeometryResource.KeepAlive(), this.geometryResource && this.instanceGeometryResource) {
            if (!this.geometryResource.IsGood()) return;
            this.instanceGeometryResource.Render(effect, this.geometryResource.meshes[0].buffer, this.geometryResource.meshes[0].indexes, this.geometryResource.meshes[0].declaration, this.geometryResource.meshes[0].declaration.stride)
        }
    }, Inherit(Tw2InstancedMeshBatch, Tw2RenderBatch), Tw2InstancedMeshBatch.prototype.Commit = function (overrideEffect) {
        var effect = "undefined" == typeof overrideEffect ? this.effect : overrideEffect;
        this.instanceMesh && effect && this.instanceMesh.RenderAreas(effect)
    }, Tw2StaticEmitter.prototype.Initialize = function () {
        "" != this.geometryResourcePath && (this.geometryResource = resMan.GetResource(this.geometryResourcePath), this.geometryResource.systemMirror = !0, this.geometryResource.RegisterNotification(this)), this._spawned = !1
    }, Tw2StaticEmitter.prototype.RebuildCachedData = function () {
        this.geometryResource && this.geometryResource.meshes.length && (this.geometryResource.meshes[0].bufferData || (this.geometryResource.systemMirror = !0, this.geometryResource.Reload()))
    }, Tw2StaticEmitter.prototype.Update = function () {
        if (!this._spawned && this.particleSystem && this.geometryResource && this.geometryResource.IsGood() && this.geometryResource.meshes.length > this.geometryIndex && this.geometryResource.meshes[this.geometryIndex].bufferData) {
            this._spawned = !0;
            for (var mesh = this.geometryResource.meshes[this.geometryIndex], elts = this.particleSystem.elements, inputs = new Array(elts.length), i = 0; i < elts.length; ++i) {
                var d = elts[i].GetDeclaration(),
                    input = mesh.declaration.FindUsage(d.usage, d.usageIndex - 8);
                if (null == input) return void console.error("Tw2StaticEmitter: ", "input geometry res '", this.geometryResource.path, "' mesh lacks (", d.usage, ", ", d.usageIndex, ") element required by particle system");
                if (input.elements < d.elements) return void console.error("Tw2StaticEmitter: ", "input geometry res '", this.geometryResource.path, "' mesh elements (", d.usage, ", ", d.usageIndex, ") does not have required number of components");
                inputs[i] = input.offset / 4
            }
            for (var vertexCount = mesh.bufferData.length / mesh.declaration.stride * 4, i = 0; vertexCount > i; ++i) {
                var index = this.particleSystem.BeginSpawnParticle();
                if (null == index) break;
                for (var j = 0; j < this.particleSystem._elements.length; ++j)
                    for (var e = this.particleSystem._elements[j], k = 0; k < e.dimension; ++k) e.buffer[e.instanceStride * index + e.startOffset + k] = mesh.bufferData[inputs[j] + k + i * mesh.declaration.stride / 4];
                this.particleSystem.EndSpawnParticle()
            }
        }
    }, Tw2DynamicEmitter.prototype.Initialize = function () {
        this.Rebind()
    }, Tw2DynamicEmitter.prototype.Update = function (dt) {
        this.SpawnParticles(null, null, Math.min(dt, .1))
    }, Tw2DynamicEmitter.prototype.Rebind = function () {
        if (this.isValid = !1, this.particleSystem) {
            for (var i = 0; i < this.generators.length; ++i)
                if (!this.generators[i].Bind(this.particleSystem)) return;
            this.isValid = !0
        }
    }, Tw2DynamicEmitter.prototype.SpawnParticles = function (position, velocity, rateModifier) {
        if (this.isValid) {
            this._accumulatedRate += this.rate * rateModifier;
            var count = Math.floor(this._accumulatedRate);
            this._accumulatedRate -= count;
            for (var i = 0; count > i; ++i) {
                var index = this.particleSystem.BeginSpawnParticle();
                if (null == index) break;
                for (var j = 0; j < this.generators.length; ++j) this.generators[j].Generate(position, velocity, index);
                this.particleSystem.EndSpawnParticle()
            }
        }
    }, Tw2RandomUniformAttributeGenerator.prototype.Bind = function (ps) {
        for (var i = 0; i < ps._elements.length; ++i)
            if (ps._elements[i].elementType == this.elementType && (this.elementType != Tw2ParticleElementDeclaration.CUSTOM || ps._elements[i].customName == this.customName)) return this._element = ps._elements[i], !0;
        return !1
    }, Tw2RandomUniformAttributeGenerator.prototype.Generate = function (position, velocity, index) {
        for (var i = 0; i < this._element.dimension; ++i) this._element.buffer[this._element.instanceStride * index + this._element.startOffset + i] = this.minRange[i] + Math.random() * (this.maxRange[i] - this.minRange[i])
    }, Tw2SphereShapeAttributeGenerator.prototype.Bind = function (ps) {
        this._position = null, this._velocity = null;
        for (var i = 0; i < ps._elements.length; ++i) ps._elements[i].elementType == Tw2ParticleElementDeclaration.POSITION && this.controlPosition ? this._position = ps._elements[i] : ps._elements[i].elementType == Tw2ParticleElementDeclaration.VELOCITY && this.controlVelocity && (this._velocity = ps._elements[i]);
        return !(this.controlPosition && null == this._position || this.controlVelocity && null == this._velocity)
    }, Tw2SphereShapeAttributeGenerator.prototype.Generate = function (position, velocity, index) {
        var phi = (this.minPhi + Math.random() * (this.maxPhi - this.minPhi)) / 180 * Math.PI,
            theta = (this.minTheta + Math.random() * (this.maxTheta - this.minTheta)) / 180 * Math.PI,
            rv = vec3.create();
        if (rv[0] = Math.sin(phi) * Math.cos(theta), rv[1] = -Math.cos(phi), rv[2] = Math.sin(phi) * Math.sin(theta), quat4.multiplyVec3(this.rotation, rv), this._velocity) {
            var speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed),
                offset = this._velocity.instanceStride * index + this._velocity.startOffset;
            this._velocity.buffer[offset] = rv[0] * speed, this._velocity.buffer[offset + 1] = rv[1] * speed, this._velocity.buffer[offset + 2] = rv[2] * speed, velocity && (this._velocity.buffer[offset] += velocity.buffer[velocity.offset] * this.parentVelocityFactor, this._velocity.buffer[offset + 1] += velocity.buffer[velocity.offset + 1] * this.parentVelocityFactor, this._velocity.buffer[offset + 2] += velocity.buffer[velocity.offset + 2] * this.parentVelocityFactor)
        }
        if (this._position) {
            vec3.scale(rv, this.minRadius + Math.random() * (this.maxRadius - this.minRadius)), vec3.add(rv, this.position), position && (rv[0] += position.buffer[position.offset], rv[1] += position.buffer[position.offset + 1], rv[2] += position.buffer[position.offset + 2]);
            var offset = this._position.instanceStride * index + this._position.startOffset;
            this._position.buffer[offset] = rv[0], this._position.buffer[offset + 1] = rv[1], this._position.buffer[offset + 2] = rv[2]
        }
    }, Tw2ParticleSpring.prototype.ApplyForce = function (position, velocity, force) {
        force[0] += (this.position[0] - position.buffer[position.offset]) * this.springConstant, force[1] += (this.position[1] - position.buffer[position.offset + 1]) * this.springConstant, force[2] += (this.position[2] - position.buffer[position.offset + 2]) * this.springConstant
    }, Tw2ParticleSpring.prototype.Update = function () {
    }, Tw2ParticleDragForce.prototype.ApplyForce = function (position, velocity, force) {
        force[0] += velocity.buffer[velocity.offset] * -this.drag, force[1] += velocity.buffer[velocity.offset + 1] * -this.drag, force[2] += velocity.buffer[velocity.offset + 2] * -this.drag
    }, Tw2ParticleDragForce.prototype.Update = function () {
    }, s_noiseLookup = [], s_permutations = [];
    var s_globalNoiseTemps = [];
    InitializeNoise(), Tw2ParticleTurbulenceForce.tempNoise = quat4.create(), Tw2ParticleTurbulenceForce.prototype.ApplyForce = function (position, velocity, force) {
        if (0 != this.noiseLevel) {
            var pos_0 = position.buffer[position.offset] * this.frequency[0],
                pos_1 = position.buffer[position.offset + 1] * this.frequency[1],
                pos_2 = position.buffer[position.offset + 2] * this.frequency[2],
                pos_3 = this._time * this.frequency[3],
                noise = Tw2ParticleTurbulenceForce.tempNoise;
            noise[0] = noise[1] = noise[2] = noise[3] = 0;
            for (var power = .5, sum = 0, frequency = 1 / this.noiseRatio, i = 0; i < this.noiseLevel; ++i) AddNoise(pos_0, pos_1, pos_2, pos_3, power, noise), sum += power, pos_0 *= frequency, pos_1 *= frequency, pos_2 *= frequency, pos_3 *= frequency, power *= this.noiseRatio;
            force[0] += noise[0] * this.amplitude[0] * sum, force[1] += noise[1] * this.amplitude[1] * sum, force[2] += noise[2] * this.amplitude[2] * sum
        }
    }, Tw2ParticleTurbulenceForce.prototype.Update = function (dt) {
        this._time += dt
    }, Tw2ParticleDirectForce.prototype.ApplyForce = function (position, velocity, force) {
        force[0] += this.force[0], force[1] += this.force[1], force[2] += this.force[2]
    }, Tw2ParticleDirectForce.prototype.Update = function () {
    }, Tw2ParticleAttractorForce.prototype.ApplyForce = function (position, velocity, force) {
        this._tempVec[0] = this.position[0] - position.buffer[position.offset], this._tempVec[1] = this.position[1] - position.buffer[position.offset + 1], this._tempVec[2] = this.position[2] - position.buffer[position.offset + 2], vec3.scale(vec3.normalize(this._tempVec), this.magnitude), force[0] += this._tempVec[0], force[1] += this._tempVec[1], force[2] += this._tempVec[2]
    }, Tw2ParticleAttractorForce.prototype.Update = function () {
    }, Tw2ParticleFluidDragForce.prototype.ApplyForce = function (position, velocity, force, dt, mass) {
        var speed = Math.sqrt(velocity.buffer[velocity.offset] * velocity.buffer[velocity.offset] + velocity.buffer[velocity.offset + 1] * velocity.buffer[velocity.offset + 1] + velocity.buffer[velocity.offset + 2] * velocity.buffer[velocity.offset + 2]);
        this._tempVec[0] = velocity.buffer[velocity.offset] * -speed * this.drag, this._tempVec[1] = velocity.buffer[velocity.offset + 1] * -speed * this.drag, this._tempVec[2] = velocity.buffer[velocity.offset + 2] * -speed * this.drag, vec3.scale(this._tempVec, dt * mass, this._tempVec2), this._tempVec2[0] += velocity.buffer[velocity.offset], this._tempVec2[1] += velocity.buffer[velocity.offset + 1], this._tempVec2[2] += velocity.buffer[velocity.offset + 2];
        var dot = velocity.buffer[velocity.offset] * this._tempVec2[0] + velocity.buffer[velocity.offset + 1] * this._tempVec2[1] + velocity.buffer[velocity.offset + 2] * this._tempVec2[2];
        0 > dot ? (force[0] = -velocity.buffer[velocity.offset] / dt / mass, force[1] = -velocity.buffer[velocity.offset + 1] / dt / mass, force[2] = -velocity.buffer[velocity.offset + 2] / dt / mass) : vec3.set(this._tempVec, force)
    }, Tw2ParticleFluidDragForce.prototype.Update = function () {
    }, Tw2RandomIntegerAttributeGenerator.prototype.Bind = function (ps) {
        for (var i = 0; i < ps._elements.length; ++i)
            if (ps._elements[i].elementType == this.elementType && (this.elementType != Tw2ParticleElementDeclaration.CUSTOM || ps._elements[i].customName == this.customName)) return this._element = ps._elements[i], !0;
        return !1
    }, Tw2RandomIntegerAttributeGenerator.prototype.Generate = function (position, velocity, index) {
        for (var i = 0; i < this._element.dimension; ++i) this._element.buffer[this._element.instanceStride * index + this._element.startOffset + i] = Math.floor(this.minRange[i] + Math.random() * (this.maxRange[i] - this.minRange[i]) + .5)
    }, exports.Tw2Frustum = Tw2Frustum, exports.Tw2RawData = Tw2RawData, exports.Tw2BinaryReader = Tw2BinaryReader, exports.Tw2VertexElement = Tw2VertexElement, exports.Tw2VertexDeclaration = Tw2VertexDeclaration, exports.CompareDeclarationElements = CompareDeclarationElements, exports.Tw2ObjectReader = Tw2ObjectReader, exports.Tw2Resource = Tw2Resource, exports.Inherit = Inherit, exports.Tw2VariableStore = Tw2VariableStore, exports.variableStore = variableStore, exports.Tw2MotherLode = Tw2MotherLode, exports.Tw2LoadingObject = Tw2LoadingObject, exports.Tw2ResMan = Tw2ResMan, exports.resMan = resMan, exports.Tw2PerObjectData = Tw2PerObjectData, exports.Tw2SamplerState = Tw2SamplerState, exports.Tw2FloatParameter = Tw2FloatParameter, exports.Tw2Vector2Parameter = Tw2Vector2Parameter, exports.Tw2Vector3Parameter = Tw2Vector3Parameter, exports.Tw2Vector4Parameter = Tw2Vector4Parameter, exports.Tw2MatrixParameter = Tw2MatrixParameter, exports.Tw2VariableParameter = Tw2VariableParameter, exports.Tw2TextureParameter = Tw2TextureParameter, exports.Tw2TransformParameter = Tw2TransformParameter, exports.Tw2Device = Tw2Device, exports.device = device, exports.Tw2BatchAccumulator = Tw2BatchAccumulator, exports.Tw2RenderBatch = Tw2RenderBatch, exports.Tw2ForwardingRenderBatch = Tw2ForwardingRenderBatch, exports.Tw2GeometryBatch = Tw2GeometryBatch, exports.Tw2GeometryLineBatch = Tw2GeometryLineBatch, exports.Tw2GeometryMeshArea = Tw2GeometryMeshArea, exports.Tw2GeometryMeshBinding = Tw2GeometryMeshBinding, exports.Tw2GeometryModel = Tw2GeometryModel, exports.Tw2GeometrySkeleton = Tw2GeometrySkeleton, exports.Tw2GeometryBone = Tw2GeometryBone, exports.Tw2GeometryAnimation = Tw2GeometryAnimation, exports.Tw2GeometryTrackGroup = Tw2GeometryTrackGroup, exports.Tw2GeometryTransformTrack = Tw2GeometryTransformTrack, exports.Tw2GeometryCurve = Tw2GeometryCurve, exports.Tw2BlendShapeData = Tw2BlendShapeData, exports.Tw2GeometryMesh = Tw2GeometryMesh, exports.Tw2GeometryRes = Tw2GeometryRes, exports.boundsIncludePoint = boundsIncludePoint, exports.Tw2TextureRes = Tw2TextureRes, exports.Tw2EffectRes = Tw2EffectRes, exports.Tw2SamplerOverride = Tw2SamplerOverride, exports.Tw2Effect = Tw2Effect, exports.Tw2MeshArea = Tw2MeshArea, exports.Tw2MeshLineArea = Tw2MeshLineArea, exports.Tw2Mesh = Tw2Mesh, exports.Tw2Track = Tw2Track, exports.Tw2TrackGroup = Tw2TrackGroup, exports.Tw2Animation = Tw2Animation, exports.Tw2Bone = Tw2Bone, exports.Tw2Model = Tw2Model, exports.Tw2AnimationController = Tw2AnimationController, exports.Tw2RenderTarget = Tw2RenderTarget, exports.Tw2CurveSet = Tw2CurveSet, exports.Tw2ValueBinding = Tw2ValueBinding, exports.Tw2Float = Tw2Float, exports.Tw2PostProcess = Tw2PostProcess, exports.Tw2ColorKey = Tw2ColorKey, exports.Tw2ColorCurve = Tw2ColorCurve, exports.Tw2ColorKey2 = Tw2ColorKey2, exports.Tw2ColorCurve2 = Tw2ColorCurve2, exports.Tw2ColorSequencer = Tw2ColorSequencer, exports.Tw2EulerRotation = Tw2EulerRotation, exports.Tw2EventKey = Tw2EventKey, exports.Tw2EventCurve = Tw2EventCurve, exports.Perlin_start = Perlin_start, exports.Perlin_B = Perlin_B, exports.Perlin_BM = Perlin_BM, exports.Perlin_N = Perlin_N, exports.Perlin_p = Perlin_p, exports.Perlin_g1 = Perlin_g1, exports.Perlin_init = Perlin_init, exports.Perlin_noise1 = Perlin_noise1, exports.PerlinNoise1D = PerlinNoise1D, exports.Tw2PerlinCurve = Tw2PerlinCurve, exports.Tw2QuaternionSequencer = Tw2QuaternionSequencer, exports.Tw2RandomConstantCurve = Tw2RandomConstantCurve, exports.Tw2RGBAScalarSequencer = Tw2RGBAScalarSequencer, exports.Tw2Torque = Tw2Torque, exports.Tw2RigidOrientation = Tw2RigidOrientation, exports.Tw2QuaternionKey = Tw2QuaternionKey, exports.Tw2RotationCurve = Tw2RotationCurve, exports.Tw2ScalarKey = Tw2ScalarKey, exports.Tw2ScalarCurve = Tw2ScalarCurve, exports.Tw2ScalarKey2 = Tw2ScalarKey2, exports.Tw2ScalarCurve2 = Tw2ScalarCurve2, exports.Tw2ScalarSequencer = Tw2ScalarSequencer, exports.Tw2SineCurve = Tw2SineCurve, exports.Tw2TransformTrack = Tw2TransformTrack, exports.Tw2Vector2Key = Tw2Vector2Key, exports.Tw2Vector2Curve = Tw2Vector2Curve, exports.Tw2Vector3Key = Tw2Vector3Key, exports.Tw2Vector3Curve = Tw2Vector3Curve, exports.Tw2VectorKey = Tw2VectorKey, exports.Tw2VectorCurve = Tw2VectorCurve, exports.Tw2VectorSequencer = Tw2VectorSequencer, exports.Tw2XYZScalarSequencer = Tw2XYZScalarSequencer, exports.Tw2YPRSequencer = Tw2YPRSequencer, exports.Tw2MayaAnimationEngine = Tw2MayaAnimationEngine, exports.ag_horner1 = ag_horner1, exports.ag_zeroin2 = ag_zeroin2, exports.ag_zeroin = ag_zeroin, exports.polyZeroes = polyZeroes, exports.Tw2MayaScalarCurve = Tw2MayaScalarCurve, exports.Tw2MayaVector3Curve = Tw2MayaVector3Curve, exports.Tw2MayaEulerRotationCurve = Tw2MayaEulerRotationCurve, exports.Tw2QuaternionCurve = Tw2QuaternionCurve, exports.Tw2WbgTrack = Tw2WbgTrack, exports.Tw2WbgTransformTrack = Tw2WbgTransformTrack, exports.EveLocator = EveLocator, exports.EveBoosterSet = EveBoosterSet, exports.EveBoosterBatch = EveBoosterBatch, exports.EveSpriteSet = EveSpriteSet, exports.EveSpriteSetBatch = EveSpriteSetBatch, exports.EveSpriteSetItem = EveSpriteSetItem, exports.EveSpotlightSetItem = EveSpotlightSetItem, exports.EveSpotlightSet = EveSpotlightSet, exports.EveSpotlightSetBatch = EveSpotlightSetBatch, exports.EvePlaneSet = EvePlaneSet, exports.EvePlaneSetBatch = EvePlaneSetBatch, exports.EvePlaneSetItem = EvePlaneSetItem, exports.EveBasicPerObjectData = EveBasicPerObjectData, exports.EveTransform = EveTransform, exports.EveTurretData = EveTurretData, exports.EveTurretSet = EveTurretSet, exports.EveSpaceObject = EveSpaceObject, exports.EveShip = EveShip, exports.EveTurretSetLocatorInfo = EveTurretSetLocatorInfo, exports.EveSpaceObjectDecal = EveSpaceObjectDecal, exports.EveSpaceScene = EveSpaceScene, exports.EveOccluder = EveOccluder, exports.EveLensflare = EveLensflare, exports.EvePlanet = EvePlanet, exports.EveEffectRoot = EveEffectRoot, exports.EveStretch = EveStretch, exports.EvePerMuzzleData = EvePerMuzzleData, exports.EveTurretFiringFX = EveTurretFiringFX, exports.EveSOF = EveSOF, exports.Tw2ParticleElementDeclaration = Tw2ParticleElementDeclaration, exports.Tr2ParticleElement = Tr2ParticleElement, exports.Tw2ParticleSystem = Tw2ParticleSystem, exports.Tw2InstancedMesh = Tw2InstancedMesh, exports.Tw2InstancedMeshBatch = Tw2InstancedMeshBatch, exports.Tw2StaticEmitter = Tw2StaticEmitter, exports.Tw2DynamicEmitter = Tw2DynamicEmitter, exports.Tw2RandomUniformAttributeGenerator = Tw2RandomUniformAttributeGenerator, exports.Tw2SphereShapeAttributeGenerator = Tw2SphereShapeAttributeGenerator, exports.Tw2ParticleSpring = Tw2ParticleSpring, exports.Tw2ParticleDragForce = Tw2ParticleDragForce, exports.Tw2ParticleTurbulenceForce = Tw2ParticleTurbulenceForce, exports.s_globalNoiseTemps = s_globalNoiseTemps, exports.InitializeNoise = InitializeNoise, exports.AddNoise = AddNoise, exports.Tw2ParticleDirectForce = Tw2ParticleDirectForce, exports.Tw2ParticleAttractorForce = Tw2ParticleAttractorForce, exports.Tw2ParticleFluidDragForce = Tw2ParticleFluidDragForce, exports.Tw2RandomIntegerAttributeGenerator = Tw2RandomIntegerAttributeGenerator
}({}, function () {
    return this
}());