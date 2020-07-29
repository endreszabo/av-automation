package oscmapper

//import "github.com/scgolang/osc"
//import "github.com/endreszabo/oscmapper/client"

import (
	//	"errors"
	"fmt"
	//	"log"
	"net"
	"time"
)

type TouchOSC struct {
	Seen time.Time
	Addr net.Addr
}

func (t *TouchOSC) WelcomeMe() {
	fmt.Println("I am being welcomed: ", t)
	t.Seen = time.Now()
}
