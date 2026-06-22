package transport

import (
	"encoding/binary"
	"errors"
	"hash/crc32"
)

var (
	ErrShortBuffer   = errors.New("transport: buffer too short")
	ErrBadChecksum   = errors.New("transport: checksum mismatch")
	ErrBadVersion    = errors.New("transport: unsupported version")
	ErrPayloadTooBig = errors.New("transport: payload exceeds maximum size")
)

const (
	protocolVersion = 1
	maxPayloadSize  = 16 * 1024 * 1024 // 16 MB
	headerSize      = 1 + 1 + 2 + 8 + 4 + 4 // version + type + senderLen + seqNum + bodyLen + checksum
)

// Codec handles encoding and decoding of transport envelopes.
type Codec struct {
	crcTable *crc32.Table
}

// NewCodec creates a codec with CRC-32C (Castagnoli) checksumming.
func NewCodec() *Codec {
	return &Codec{crcTable: crc32.MakeTable(crc32.Castagnoli)}
}

// Encode serializes an Envelope into bytes.
// Wire format:
//   [version:1][type:1][senderLen:2][sender:N][seqNum:8][bodyLen:4][body:M][checksum:4]
func (c *Codec) Encode(env *Envelope) ([]byte, error) {
	senderLen := len(env.Header.Sender)
	bodyLen := len(env.Body)
	if bodyLen > maxPayloadSize {
		return nil, ErrPayloadTooBig
	}

	totalLen := 1 + 1 + 2 + senderLen + 8 + 4 + bodyLen + 4
	buf := make([]byte, totalLen)
	offset := 0

	buf[offset] = env.Header.Version
	offset++
	buf[offset] = byte(env.Header.Type)
	offset++
	binary.BigEndian.PutUint16(buf[offset:], uint16(senderLen))
	offset += 2
	copy(buf[offset:], env.Header.Sender)
	offset += senderLen
	binary.BigEndian.PutUint64(buf[offset:], env.Header.SeqNum)
	offset += 8
	binary.BigEndian.PutUint32(buf[offset:], uint32(bodyLen))
	offset += 4
	copy(buf[offset:], env.Body)
	offset += bodyLen

	// Checksum covers everything before the checksum field
	checksum := crc32.Checksum(buf[:offset], c.crcTable)
	binary.BigEndian.PutUint32(buf[offset:], checksum)

	return buf, nil
}

// Decode deserializes bytes into an Envelope.
func (c *Codec) Decode(data []byte) (*Envelope, error) {
	if len(data) < 16 { // minimum: version + type + senderLen(0) + seqNum + bodyLen + checksum
		return nil, ErrShortBuffer
	}

	offset := 0
	version := data[offset]
	offset++
	if version != protocolVersion {
		return nil, ErrBadVersion
	}
	msgType := MsgType(data[offset])
	offset++
	senderLen := int(binary.BigEndian.Uint16(data[offset:]))
	offset += 2
	if offset+senderLen+8+4+4 > len(data) {
		return nil, ErrShortBuffer
	}
	sender := string(data[offset : offset+senderLen])
	offset += senderLen
	seqNum := binary.BigEndian.Uint64(data[offset:])
	offset += 8
	bodyLen := int(binary.BigEndian.Uint32(data[offset:]))
	offset += 4
	if bodyLen > maxPayloadSize {
		return nil, ErrPayloadTooBig
	}
	if offset+bodyLen+4 > len(data) {
		return nil, ErrShortBuffer
	}
	body := make([]byte, bodyLen)
	copy(body, data[offset:offset+bodyLen])
	offset += bodyLen

	// Verify checksum
	expectedCRC := binary.BigEndian.Uint32(data[offset:])
	actualCRC := crc32.Checksum(data[:offset], c.crcTable)
	if expectedCRC != actualCRC {
		return nil, ErrBadChecksum
	}

	return &Envelope{
		Header: Header{
			Version:  version,
			Type:     msgType,
			Sender:   sender,
			SeqNum:   seqNum,
			BodyLen:  uint32(bodyLen),
			Checksum: expectedCRC,
		},
		Body: body,
	}, nil
}

// EncodeVarint encodes a uint64 as a variable-length integer (LEB128).
func EncodeVarint(v uint64) []byte {
	var buf [10]byte
	n := 0
	for v >= 0x80 {
		buf[n] = byte(v) | 0x80
		v >>= 7
		n++
	}
	buf[n] = byte(v)
	n++
	return buf[:n]
}

// DecodeVarint reads a varint from the given bytes.
// Returns the decoded value and the number of bytes consumed.
func DecodeVarint(data []byte) (uint64, int, error) {
	var val uint64
	var shift uint
	for i, b := range data {
		if i >= 10 {
			return 0, 0, errors.New("transport: varint overflow")
		}
		val |= uint64(b&0x7F) << shift
		if b < 0x80 {
			return val, i + 1, nil
		}
		shift += 7
	}
	return 0, 0, ErrShortBuffer
}

// EncodeZigZag encodes a signed integer using ZigZag encoding
// so that small absolute values have small unsigned representations.
func EncodeZigZag(v int64) uint64 {
	return uint64((v << 1) ^ (v >> 63))
}

// DecodeZigZag decodes a ZigZag-encoded unsigned integer back to signed.
func DecodeZigZag(v uint64) int64 {
	return int64((v >> 1) ^ -(v & 1))
}

// EncodeString writes a length-prefixed string (varint length + bytes).
func EncodeString(s string) []byte {
	lenBytes := EncodeVarint(uint64(len(s)))
	buf := make([]byte, len(lenBytes)+len(s))
	copy(buf, lenBytes)
	copy(buf[len(lenBytes):], s)
	return buf
}

// DecodeString reads a length-prefixed string.
func DecodeString(data []byte) (string, int, error) {
	strLen, n, err := DecodeVarint(data)
	if err != nil {
		return "", 0, err
	}
	if n+int(strLen) > len(data) {
		return "", 0, ErrShortBuffer
	}
	return string(data[n : n+int(strLen)]), n + int(strLen), nil
}

// EncodeBytes writes a length-prefixed byte slice.
func EncodeBytes(b []byte) []byte {
	lenBytes := EncodeVarint(uint64(len(b)))
	buf := make([]byte, len(lenBytes)+len(b))
	copy(buf, lenBytes)
	copy(buf[len(lenBytes):], b)
	return buf
}

// DecodeBytes reads a length-prefixed byte slice.
func DecodeBytes(data []byte) ([]byte, int, error) {
	bLen, n, err := DecodeVarint(data)
	if err != nil {
		return nil, 0, err
	}
	if n+int(bLen) > len(data) {
		return nil, 0, ErrShortBuffer
	}
	result := make([]byte, bLen)
	copy(result, data[n:n+int(bLen)])
	return result, n + int(bLen), nil
}