package transport

// MsgType identifies the kind of message on the wire.
type MsgType uint8

const (
	MsgPing           MsgType = 0x01
	MsgPingReq        MsgType = 0x02
	MsgAck            MsgType = 0x03
	MsgNack           MsgType = 0x04
	MsgGossipPush     MsgType = 0x10
	MsgGossipPull     MsgType = 0x11
	MsgGossipPushPull MsgType = 0x12
	MsgGossipDigest   MsgType = 0x13
	MsgMemberJoin     MsgType = 0x20
	MsgMemberLeave    MsgType = 0x21
	MsgMemberState    MsgType = 0x22
	MsgMerkleDiff     MsgType = 0x30
	MsgMerkleSync     MsgType = 0x31
	MsgCRDTState      MsgType = 0x40
	MsgCRDTDelta      MsgType = 0x41
)

// Header is the fixed-size prefix of every message.
type Header struct {
	Version  uint8
	Type     MsgType
	Sender   string
	SeqNum   uint64
	BodyLen  uint32
	Checksum uint32
}

// Envelope wraps a header and raw body bytes for transport.
type Envelope struct {
	Header Header
	Body   []byte
}

// Address represents a network endpoint.
type Address struct {
	Host string
	Port uint16
}

// String returns host:port representation.
func (a Address) String() string {
	return a.Host + ":" + portStr(a.Port)
}

func portStr(p uint16) string {
	buf := make([]byte, 0, 5)
	if p == 0 {
		return "0"
	}
	for p > 0 {
		buf = append(buf, byte('0'+p%10))
		p /= 10
	}
	for i, j := 0, len(buf)-1; i < j; i, j = i+1, j-1 {
		buf[i], buf[j] = buf[j], buf[i]
	}
	return string(buf)
}
