package oscmapper

//import "github.com/endreszabo/oscmapper/pkg/client"
import "fmt"
import "time"
import "net"
import "github.com/scgolang/osc"

type OscMapper struct {
	Clients map[string]*TouchOSC
}

func (m *OscMapper) NewClient(addr net.Addr) *TouchOSC {
	a := TouchOSC{Seen: time.Now(), Addr: addr}
	m.Clients[addr.String()] = &a
	fmt.Println("New client at:", addr)
	m.WelcomeClient(&a)
	return &a
}

func (m *OscMapper) WelcomeClient(client *TouchOSC) {
	fmt.Println("Welcoming client: ", *client)
	client.WelcomeMe()
}

func NewOscMapper() *OscMapper {
	m := OscMapper{Clients: make(map[string]*TouchOSC)}
	m.ClientReaper()
	return &m
}

func (m *OscMapper) ClientReaper() {
	ticker := time.NewTicker(time.Duration(18) * time.Second)
	go func() {
		for {
			select {
			case <-ticker.C:
				fmt.Println("Clients list:")

				for addr, TouchOSC := range m.Clients {
					fmt.Println("Considering", addr, TouchOSC)
					if time.Since(TouchOSC.Seen) > time.Second*5 {
						fmt.Printf("Client %s timed out\n", addr)
						delete(m.Clients, addr)
					}
				}
			}
		}
	}()
}

func (m *OscMapper) HasClient(thisaddr net.Addr) bool {
	thisaddr_s := thisaddr.String()
	for addr, TouchOSC := range m.Clients {
		if addr == thisaddr_s {
			TouchOSC.Seen = time.Now()
			return true
		}
	}
	return false
}

func (m *OscMapper) Broadcast(conn *osc.UDPConn, msg osc.Message) int {
	a:=0
	for _, TouchOSC := range m.Clients {
		a+=1
		conn.SendTo(TouchOSC.Addr, msg)
	}
	return a
}
